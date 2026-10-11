import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getOrderOwned, rebuildDraftOrder } from "@/lib/checkout";

/**
 * POST /api/zuzu/redeem — toggle ZUZU points redemption on the draft order.
 * Body: { orderId, usePoints: boolean }
 * 1000 pts = $1 discount.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Login required." }, { status: 401 });

  const { orderId, usePoints } = await req.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ ok: false, error: "Missing order." }, { status: 400 });

  const order = await getOrderOwned(orderId);
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  }

  try {
    const u = await db.user.findUnique({ where: { id: user.id }, select: { zuzuPoints: true } });
    const balance = u?.zuzuPoints ?? 0;

    await db.order.update({
      where: { id: orderId },
      data: { zuzuPointsRedeemed: usePoints ? balance : 0 },
    });
    await rebuildDraftOrder(orderId);

    const updated = await db.order.findUnique({
      where: { id: orderId },
      select: { zuzuPointsRedeemed: true, zuzuDiscountCents: true, totalCents: true },
    });
    return NextResponse.json({ ok: true, ...updated, balance });
  } catch (e) {
    console.error("zuzu/redeem error", e);
    return NextResponse.json({ ok: false, error: "Could not apply points." }, { status: 500 });
  }
}
