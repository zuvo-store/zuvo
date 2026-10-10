export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sha256hex } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const invalid = () => NextResponse.redirect(new URL("/auth/verify-email?error=invalid", req.url));

  if (!token) return invalid();

  const rec = await db.emailToken.findUnique({ where: { tokenHash: sha256hex(token) } });
  if (!rec || rec.type !== "VERIFY" || rec.usedAt || rec.expiresAt < new Date()) return invalid();

  await db.emailToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  await db.user.update({ where: { id: rec.userId }, data: { emailVerified: new Date() } });
  await audit("auth.verify-email", { actorId: rec.userId, entity: "User", entityId: rec.userId });

  return NextResponse.redirect(new URL("/auth/verify-email?verified=1", req.url));
}
