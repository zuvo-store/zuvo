import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/admin/carts — abandoned carts (admin only).
 * A cart is "abandoned" when items sit 2+ hours with no completed order after.
 * Only includes carts tied to a user with an email (so we can reach them).
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const items = await db.cartItem.findMany({
      where: { userId: { not: null }, updatedAt: { lt: cutoff } },
      select: {
        userId: true, qty: true, updatedAt: true,
        product: { select: { name: true, priceCents: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    // Group by user
    const byUser = new Map<string, typeof items>();
    for (const it of items) {
      const uid = it.userId!;
      const list = byUser.get(uid) ?? [];
      list.push(it);
      byUser.set(uid, list);
    }

    const carts = [];
    for (const [uid, list] of byUser) {
      const user = list[0].user!;
      // Skip if they completed an order after the cart's last activity
      const lastActivity = list.reduce((m, it) => (it.updatedAt > m ? it.updatedAt : m), list[0].updatedAt);
      const recentOrder = await db.order.findFirst({
        where: { userId: uid, status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: lastActivity } },
        select: { id: true },
      });
      if (recentOrder) continue;
      const totalCents = list.reduce((s, it) => s + it.product.priceCents * it.qty, 0);
      carts.push({
        userId: uid,
        name: user.name,
        email: user.email,
        itemCount: list.reduce((s, it) => s + it.qty, 0),
        totalCents,
        lastActivity: lastActivity.toISOString(),
        items: list.map((it) => `${it.qty}× ${it.product.name}`),
      });
    }
    carts.sort((a, b) => b.totalCents - a.totalCents);
    return NextResponse.json({ ok: true, carts: carts.slice(0, 50) });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
