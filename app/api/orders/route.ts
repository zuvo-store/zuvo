export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSessionUser, getGuestToken } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  const where = user
    ? { userId: user.id, status: { not: "DRAFT" } }
    : { userId: null, guestToken: await getGuestToken(), status: { not: "DRAFT" } };
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return Response.json({
    ok: true,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
      itemCount: o._count.items,
    })),
  });
}
