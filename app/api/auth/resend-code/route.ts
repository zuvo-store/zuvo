export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeEmail, isEmail, randomOtp, sha256hex } from "@/lib/auth";
import { sendEmail, emailConfigured } from "@/lib/email";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson, verifyCodeHtml } from "../../_helpers";
import { OTP_TTL_MS } from "../signup/route";

/**
 * Resend the signup OTP code. Rate-limited; invalidates previous codes.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "resend-code");
  if (limited) return limited;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });

  const email = normalizeEmail(String(body.email ?? ""));
  if (!isEmail(email))
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  // Always return ok to avoid leaking which emails are registered; but only
  // send when there's an unverified user.
  if (user && !user.emailVerified) {
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
    await audit("auth.resend-code", { actorId: user.id, entity: "User", entityId: user.id });
    if (!emailConfigured()) {
      return NextResponse.json({ ok: true, demoCode: otp });
    }
  }

  return NextResponse.json({ ok: true });
}
