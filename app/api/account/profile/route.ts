export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 2) {
    return Response.json({ ok: false, error: "Name must be at least 2 characters." }, { status: 400 });
  }
  const updated = await db.user.update({ where: { id: user.id }, data: { name } });
  await audit("user.profile", { actorId: user.id, entity: "User", entityId: user.id, meta: { field: "name" } });
  return Response.json({ ok: true, user: { id: updated.id, name: updated.name, email: updated.email } });
}
