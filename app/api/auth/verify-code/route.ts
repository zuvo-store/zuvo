export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import {
  normalizeEmail,
  isEmail,
  sha256hex,
  createSession,
  getGuestToken,
} from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson } from "../../_helpers";

/**
 * Verify a signup OTP code. On success the email is marked verified and a
 * session is created (the user is logged in).
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "verify-code");
  if (limited) return limited;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });

  const email = normalizeEmail(String(body.email ?? ""));
  const code = String(body.code ?? "").trim();
  if (!isEmail(email) || !/^\d{6}$/.test(code))
    return NextResponse.json(
      { ok: false, error: "Please enter the 6-digit code sent to your email." },
      { status: 400 }
    );

  const user = await db.user.findUnique({ where: { email } });
  if (!user)
    return NextResponse.json({ ok: false, error: "Code is incorrect or expired." }, { status: 400 });

  const expectedHash = sha256hex(`otp:${user.id}:${code}`);
  const token = await db.emailToken.findFirst({
    where: {
      userId: user.id,
      type: "OTP",
      tokenHash: expectedHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  // Timing-safe compare even on miss path shape (token lookup already hashes).
  let valid = !!token;
  if (token) {
    const a = Buffer.from(token.tokenHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    valid = a.length === b.length && timingSafeEqual(a, b);
  }
  if (!valid) {
    await audit("auth.verify-code.failed", {
      actorId: user.id,
      entity: "User",
      entityId: user.id,
    });
    return NextResponse.json(
      { ok: false, error: "Code is incorrect or expired. Please try again." },
      { status: 400 }
    );
  }

  await db.$transaction([
    db.emailToken.update({ where: { id: token!.id }, data: { usedAt: new Date() } }),
    db.emailToken.deleteMany({ where: { userId: user.id, type: "OTP", id: { not: token!.id } } }),
    db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
  ]);

  try {
    await createSession(user.id, false);
  } catch (e) {
    console.error("verify-code: createSession failed", e);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
  try {
    await mergeGuestCartIntoUser(user.id, await getGuestToken());
  } catch {
    // Cart merge must never break verification.
  }

  await audit("auth.verify-code", { actorId: user.id, entity: "User", entityId: user.id });

  return NextResponse.json({ ok: true });
}
