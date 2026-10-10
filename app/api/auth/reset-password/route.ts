export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, passwordIssues, sha256hex } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { rateLimitOr429, readJson } from "../../_helpers";

export async function POST(req: NextRequest) {
  const limited = rateLimitOr429(req, "reset-password");
  if (limited) return limited;

  const body = await readJson(req);
  const token = String(body?.token ?? "");
  const password = String(body?.password ?? "");
  const confirmPassword = String(body?.confirmPassword ?? "");

  if (!token)
    return NextResponse.json({ ok: false, error: "Reset token is missing." }, { status: 400 });

  const rec = await db.emailToken.findUnique({ where: { tokenHash: sha256hex(token) } });
  if (!rec || rec.type !== "RESET" || rec.usedAt || rec.expiresAt < new Date())
    return NextResponse.json(
      { ok: false, error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 }
    );

  const issues = passwordIssues(password);
  if (issues.length > 0) return NextResponse.json({ ok: false, error: issues[0] }, { status: 400 });
  if (password !== confirmPassword)
    return NextResponse.json({ ok: false, error: "Passwords do not match." }, { status: 400 });

  await db.user.update({
    where: { id: rec.userId },
    data: { passwordHash: await hashPassword(password) },
  });
  await db.emailToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  // Invalidate every session so a password change signs the account out everywhere.
  await db.session.deleteMany({ where: { userId: rec.userId } });

  await audit("auth.reset-password", { actorId: rec.userId, entity: "User", entityId: rec.userId });

  return NextResponse.json({ ok: true });
}
