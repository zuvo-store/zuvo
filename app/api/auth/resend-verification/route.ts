export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, randomToken, sha256hex } from "@/lib/auth";
import { sendEmail, emailConfigured, appUrl } from "@/lib/email";
import { audit } from "@/lib/audit";
import { rateLimitOr429, verifyEmailHtml } from "../../_helpers";

export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "resend-verification");
  if (limited) return limited;

  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  if (user.emailVerified) return NextResponse.json({ ok: true, already: true });

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

  await audit("auth.resend-verification", { actorId: user.id, entity: "User", entityId: user.id });

  const res: Record<string, unknown> = { ok: true };
  if (!emailConfigured()) res.demoVerifyLink = verifyLink;
  return NextResponse.json(res);
}
