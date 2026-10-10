export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSessionUser, destroySession, verifyPassword, normalizeEmail } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * Permanently deletes the signed-in account. The caller must confirm by
 * typing their account email and providing their current password.
 * Cascades remove sessions, addresses, cart, wishlist and rewards; orders are
 * kept but detached (userId set to null) so business records survive.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json({ ok: false, error: "Type your email and enter your password to confirm." }, { status: 400 });
  }
  if (email !== user.email) {
    return Response.json({ ok: false, error: "The typed email does not match this account." }, { status: 400 });
  }
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password, record.passwordHash))) {
    return Response.json({ ok: false, error: "Password is incorrect." }, { status: 400 });
  }
  // Referral attributions pointing at this user as referrer have no cascade;
  // remove them explicitly before deleting the user row.
  await db.referralAttribution.deleteMany({ where: { referrerId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  await audit("user.deleted", { entity: "User", entityId: user.id, meta: { email: user.email } });
  await destroySession();
  return Response.json({ ok: true });
}
