import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** POST /api/admin/notifications/read — mark notifications read. Body: { ids?: string[], all?: boolean } */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { ids, all } = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean };
    if (all) {
      await db.notification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await db.notification.updateMany({ where: { id: { in: ids } }, data: { readAt: new Date() } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
