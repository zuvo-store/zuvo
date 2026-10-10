export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  normalizeEmail,
  isEmail,
  passwordIssues,
  uniqueReferralCode,
  createSession,
  getGuestToken,
  randomToken,
  sha256hex,
} from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { attributeReferral } from "@/lib/referrals";
import { ensureRewardForUser } from "@/lib/rewards";
import { sendEmail, emailConfigured, appUrl } from "@/lib/email";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson, verifyEmailHtml } from "../../_helpers";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;

export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "signup");
  if (limited) return limited;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const username = String(body.username ?? "").trim();
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const referralCode = body.referralCode ? String(body.referralCode) : undefined;
  const terms = body.terms;

  const errors: string[] = [];
  if (name.length < 2) errors.push("Please enter your full name (at least 2 characters).");
  if (!USERNAME_RE.test(username))
    errors.push("Username must be 3–20 characters and may only contain letters, numbers, _ . -");
  if (!isEmail(email)) errors.push("Please enter a valid email address.");
  errors.push(...passwordIssues(password));
  if (password !== confirmPassword) errors.push("Passwords do not match.");
  if (terms !== true) errors.push("You must accept the Terms of Service to create an account.");
  if (errors.length > 0)
    return NextResponse.json({ ok: false, error: errors[0], errors }, { status: 400 });

  const [emailTaken, usernameTaken] = await Promise.all([
    db.user.findUnique({ where: { email } }),
    db.user.findUnique({ where: { username } }),
  ]);
  if (emailTaken)
    return NextResponse.json(
      { ok: false, error: "An account with this email already exists. Try signing in instead." },
      { status: 409 }
    );
  if (usernameTaken)
    return NextResponse.json(
      { ok: false, error: "This username is taken. Please choose another." },
      { status: 409 }
    );

  let user;
  try {
    user = await db.user.create({
      data: {
        name,
        username,
        email,
        passwordHash: await hashPassword(password),
        role: "CUSTOMER",
        referralCode: await uniqueReferralCode(),
      },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002")
      return NextResponse.json(
        { ok: false, error: "An account with these details already exists." },
        { status: 409 }
      );
    throw e;
  }

  await createSession(user.id, false);
  try {
    await mergeGuestCartIntoUser(user.id, await getGuestToken());
  } catch {
    // Cart merge must never break signup.
  }

  let referralWarning: string | undefined;
  if (referralCode) {
    const attr = await attributeReferral(user.id, referralCode);
    if (attr.ok === false) referralWarning = attr.error;
  }

  try {
    await ensureRewardForUser(user.id);
  } catch {
    // Reward enrollment must never break signup.
  }

  const token = randomToken();
  await db.emailToken.deleteMany({ where: { userId: user.id, type: "VERIFY" } });
  await db.emailToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256hex(token),
      type: "VERIFY",
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  const verifyLink = `${appUrl()}/auth/verify-email?token=${token}`;
  await sendEmail(user.email, "Verify your ZUVO account", verifyEmailHtml(user.name, verifyLink)).catch(
    () => ({ sent: false, demo: true })
  );

  await audit("auth.signup", { actorId: user.id, entity: "User", entityId: user.id, meta: { username } });

  const res: Record<string, unknown> = { ok: true };
  if (referralWarning) res.referralWarning = referralWarning;
  if (!emailConfigured()) res.demoVerifyLink = verifyLink;
  return NextResponse.json(res);
}
