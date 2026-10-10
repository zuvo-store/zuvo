export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeEmail, isEmail, randomToken, sha256hex } from "@/lib/auth";
import { sendEmail, emailConfigured, appUrl } from "@/lib/email";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson, resetEmailHtml } from "../../_helpers";

export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "forgot-password");
  if (limited) return limited;

  const body = await readJson(req);
  const email = normalizeEmail(String(body?.email ?? ""));

  // Always respond with success so account existence is never revealed.
  let demoResetLink: string | undefined;

  if (isEmail(email)) {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      await db.emailToken.deleteMany({ where: { userId: user.id, type: "RESET" } });
      const token = randomToken();
      await db.emailToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256hex(token),
          type: "RESET",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const resetLink = `${appUrl()}/auth/reset-password?token=${token}`;
      await sendEmail(user.email, "Reset your ZUVO password", resetEmailHtml(user.name, resetLink)).catch(
        () => ({ sent: false, demo: true })
      );
      await audit("auth.forgot-password", { actorId: user.id, entity: "User", entityId: user.id });
      if (!emailConfigured()) demoResetLink = resetLink;
    }
  }

  const res: Record<string, unknown> = { ok: true };
  if (demoResetLink) res.demoResetLink = demoResetLink;
  return NextResponse.json(res);
}
