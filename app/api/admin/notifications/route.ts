import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/admin/notifications — latest notifications + unread count. Admin only. */
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const [items, unread] = await Promise.all([
      db.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
      }),
      db.notification.count({ where: { readAt: null } }),
    ]);
    return NextResponse.json({ ok: true, notifications: items, unread });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
