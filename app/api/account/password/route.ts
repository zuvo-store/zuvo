export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSessionUser, verifyPassword, hashPassword, passwordIssues, rateLimit } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const rl = rateLimit(`pw:${user.id}`, 5, 60_000);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: `Too many attempts. Try again in ${rl.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }
  const body = (await req.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
    confirmPassword?: unknown;
  } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const isGoogleUser = record.provider === "google";
  if (!newPassword || !confirmPassword) {
    return Response.json({ ok: false, error: "New password and confirmation are required." }, { status: 400 });
  }
  if (!isGoogleUser) {
    if (!currentPassword) {
      return Response.json({ ok: false, error: "All password fields are required." }, { status: 400 });
    }
    if (!(await verifyPassword(currentPassword, record.passwordHash))) {
      return Response.json({ ok: false, error: "Current password is incorrect." }, { status: 400 });
    }
  }
  if (newPassword !== confirmPassword) {
    return Response.json({ ok: false, error: "New passwords do not match." }, { status: 400 });
  }
  const issues = passwordIssues(newPassword);
  if (issues.length > 0) {
    return Response.json({ ok: false, error: issues.join(" ") }, { status: 400 });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await audit("user.password_changed", { actorId: user.id, entity: "User", entityId: user.id });
  return Response.json({ ok: true });
}
