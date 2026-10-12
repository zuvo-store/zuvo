import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/vouchers/available — vouchers the signed-in user can use right now */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, vouchers: [] }, { status: 401 });

  const now = new Date();
  const [promotions, usedOrders] = await Promise.all([
    db.promotion.findMany({
      where: {
        code: { not: null },
        active: true,
        OR: [{ userId: null }, { userId: user.id }],
      },
      select: {
        id: true, code: true, title: true, discountType: true,
        discountValue: true, minOrderCents: true, endsAt: true,
        usageLimit: true, usedCount: true, userId: true,
      },
      orderBy: { discountValue: "desc" },
    }),
    db.order.findMany({
      where: { userId: user.id, promoCode: { not: null }, status: { notIn: ["DRAFT", "PENDING_PAYMENT", "CANCELLED"] } },
      select: { promoCode: true },
    }),
  ]);

  const usedCodes = new Set(usedOrders.map((o) => (o.promoCode ?? "").toUpperCase()));

  const vouchers = promotions
    .filter((p) => {
      if (!p.code || usedCodes.has(p.code.toUpperCase())) return false;
      if (p.endsAt && p.endsAt < now) return false;
      if (p.usageLimit !== null && p.usedCount >= p.usageLimit) return false;
      return true;
    })
    .map((p) => ({
      code: p.code!,
      title: p.title,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minOrderCents: p.minOrderCents,
      endsAt: p.endsAt,
      personal: p.userId === user.id,
    }));

  return NextResponse.json({ ok: true, vouchers });
}
