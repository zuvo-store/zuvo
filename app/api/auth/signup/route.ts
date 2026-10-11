export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hashPassword,
  normalizeEmail,
  isEmail,
  passwordIssues,
  uniqueReferralCode,
  randomOtp,
  sha256hex,
} from "@/lib/auth";
import { attributeReferral } from "@/lib/referrals";
import { ensureRewardForUser } from "@/lib/rewards";
import { sendEmail, emailConfigured } from "@/lib/email";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson, verifyCodeHtml } from "../../_helpers";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;

/** OTP validity: 10 minutes. */
export const OTP_TTL_MS = 10 * 60 * 1000;

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

  // NOTE: no session is created here — the user must verify the OTP first.
  // Referral + reward are safe to attach now; cart merge happens at verification.

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

  // Issue a 6-digit OTP (hashed at rest, 10-minute expiry).
  const otp = randomOtp();
  await db.emailToken.deleteMany({ where: { userId: user.id, type: "OTP" } });
  await db.emailToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256hex(`otp:${user.id}:${otp}`),
      type: "OTP",
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  if (emailConfigured()) {
    await sendEmail(user.email, "Your ZUVO verification code", verifyCodeHtml(user.name, otp)).catch(
      () => ({ sent: false, demo: true })
    );
  }

  await audit("auth.signup", { actorId: user.id, entity: "User", entityId: user.id, meta: { username } });

  const res: Record<string, unknown> = { ok: true, needsCode: true, email: user.email };
  if (referralWarning) res.referralWarning = referralWarning;
  if (!emailConfigured()) res.demoCode = otp; // demo mode: show the code on screen
  return NextResponse.json(res);
}
