import { db } from "@/lib/db";

/** Gather a compact, comprehensive business snapshot for the AI briefing. */
export async function getBusinessSnapshot() {
  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);

  const [pays30, paysPrev, orders30, ordersByStatus, users30, usersPrev, lowStock, topProducts, categories, refunds] =
    await Promise.all([
      db.payment.findMany({ where: { status: "SUCCEEDED", createdAt: { gte: d30 } }, select: { amountCents: true } }),
      db.payment.findMany({ where: { status: "SUCCEEDED", createdAt: { gte: d60, lt: d30 } }, select: { amountCents: true } }),
      db.order.findMany({ where: { status: { not: "DRAFT" }, createdAt: { gte: d30 } }, select: { id: true, status: true, totalCents: true } }),
      db.order.groupBy({ by: ["status"], where: { status: { not: "DRAFT" } }, _count: true }),
      db.user.count({ where: { createdAt: { gte: d30 } } }),
      db.user.count({ where: { createdAt: { gte: d60, lt: d30 } } }),
      db.product.count({ where: { active: true, stock: { lte: 5 } } }),
      db.orderItem.groupBy({
        by: ["productId"], where: { order: { status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: d30 } } },
        _sum: { qty: true, lineTotalCents: true }, orderBy: { _sum: { lineTotalCents: "desc" } }, take: 5,
      }),
      db.orderItem.groupBy({
        by: ["productId"], where: { order: { status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: d30 } } },
        _sum: { lineTotalCents: true },
      }),
      db.order.count({ where: { status: "REFUNDED", createdAt: { gte: d30 } } }),
    ]);

  const rev30 = pays30.reduce((s, p) => s + p.amountCents, 0) / 100;
  const revPrev = paysPrev.reduce((s, p) => s + p.amountCents, 0) / 100;
  const revChange = revPrev > 0 ? Math.round(((rev30 - revPrev) / revPrev) * 100) : rev30 > 0 ? 100 : 0;
  const aov = orders30.length > 0 ? orders30.reduce((s, o) => s + o.totalCents, 0) / orders30.length / 100 : 0;

  const topIds = topProducts.map((t) => t.productId).filter((id): id is string => !!id);
  const topNames = topIds.length > 0
    ? await db.product.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(topNames.map((p) => [p.id, p.name]));
  const topList = topProducts.map((t) => ({
    name: nameById.get(t.productId!) ?? "Unknown",
    units: t._sum.qty ?? 0,
    revenue: Math.round(((t._sum.lineTotalCents ?? 0) / 100) * 100) / 100,
  }));

  // Dead stock: active products with stock but zero sales in 30d
  const soldIds = new Set(categories.map((c) => c.productId).filter((id): id is string => !!id));
  const deadStock = await db.product.count({
    where: { active: true, stock: { gt: 0 }, id: { notIn: [...soldIds] } },
  });

  const pendingOrders = ordersByStatus
    .filter((o) => ["PENDING", "CONFIRMED", "PROCESSING"].includes(o.status))
    .reduce((s, o) => s + o._count, 0);

  return {
    revenue30d: Math.round(rev30 * 100) / 100,
    revenueChangePct: revChange,
    orders30d: orders30.length,
    avgOrderValue: Math.round(aov * 100) / 100,
    ordersByStatus: ordersByStatus.map((o) => `${o.status}: ${o._count}`).join(", "),
    newCustomers30d: users30,
    newCustomersPrev: usersPrev,
    topProducts: topList,
    lowStockCount: lowStock,
    deadStockCount: deadStock,
    pendingOrders,
    refunds30d: refunds,
  };
}
