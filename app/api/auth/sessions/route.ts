export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, destroySession } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * "Sign out all devices": revokes every session for this account, including
 * the current one. The caller should redirect to the sign-in page afterwards.
 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  await destroySession();
  await db.session.deleteMany({ where: { userId: user.id } });

  await audit("auth.sessions.revoke", { actorId: user.id, entity: "Session", entityId: user.id });

  return NextResponse.json({ ok: true });
}
