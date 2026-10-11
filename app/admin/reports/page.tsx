export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls, SectionTitle, Badge } from "@/components/ui";
import { fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls } from "../_helpers";
import { requireAdminPage } from "@/lib/auth";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const topRange = sp.topRange === "7" ? 7 : sp.topRange === "90" ? 90 : 30;
  const now = new Date();

  // --- Revenue by day, last 30 days (SUCCEEDED payments) ---
  const revSince = new Date(now);
  revSince.setDate(revSince.getDate() - 29);
  revSince.setHours(0, 0, 0, 0);
  const pays = await db.payment.findMany({
    where: { status: "SUCCEEDED", createdAt: { gte: revSince } },
    select: { amountCents: true, createdAt: true },
  });
  const days: { key: string; label: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, total: 0 });
  }
  const dayMap = new Map(days.map((d) => [d.key, d]));
  for (const p of pays) {
    const d = dayMap.get(dayKey(new Date(p.createdAt)));
    if (d) d.total += p.amountCents;
  }
  const maxRev = Math.max(1, ...days.map((d) => d.total));
  const totalRev = days.reduce((s, d) => s + d.total, 0);

  // --- Top 10 products by qty sold (non-cancelled orders, selectable range) ---
  const topSince = new Date(now);
  topSince.setDate(topSince.getDate() - (topRange - 1));
  topSince.setHours(0, 0, 0, 0);
  const topItems = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: {
        status: { notIn: ["CANCELLED", "DRAFT", "PENDING_PAYMENT", "REFUNDED"] },
        createdAt: { gte: topSince },
      },
    },
    _sum: { qty: true, lineTotalCents: true },
    orderBy: { _sum: { qty: "desc" } },
    take: 10,
  });
  const topIds = topItems.map((t) => t.productId).filter((x): x is string => Boolean(x));
  const topProducts = await db.product.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true, slug: true },
  });
  const topName = new Map(topProducts.map((p) => [p.id, p]));

  // --- Orders by status ---
  const byStatus = await db.order.groupBy({ by: ["status"], _count: { status: true } });

  // --- Signups by day, last 14 days ---
  const signSince = new Date(now);
  signSince.setDate(signSince.getDate() - 13);
  signSince.setHours(0, 0, 0, 0);
  const signups = await db.user.findMany({
    where: { createdAt: { gte: signSince } },
    select: { createdAt: true },
  });
  const sdays: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    sdays.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
  }
  const sdayMap = new Map(sdays.map((d) => [d.key, d]));
  for (const u of signups) {
    const d = sdayMap.get(dayKey(new Date(u.createdAt)));
    if (d) d.count += 1;
  }
  const maxSignups = Math.max(1, ...sdays.map((d) => d.count));

  // --- Low stock alert (stock <= 10, active products) ---
  const LOW_STOCK_THRESHOLD = 10;
  const lowStock = await db.product.findMany({
    where: { active: true, stock: { lte: LOW_STOCK_THRESHOLD } },
    orderBy: { stock: "asc" },
    take: 20,
    select: { id: true, name: true, slug: true, stock: true, priceCents: true },
  });

  // --- Inventory value (active products) ---
  const invAgg = await db.product.aggregate({
    where: { active: true },
    _sum: { stock: true },
  });
  const invProducts = await db.product.findMany({
    where: { active: true },
    select: { stock: true, priceCents: true },
  });
  const inventoryValueCents = invProducts.reduce((s, p) => s + p.stock * p.priceCents, 0);
  const inventoryUnits = invAgg._sum.stock ?? 0;

  // --- Profit report: revenue - cost of goods sold (non-cancelled orders) ---
  const soldItems = await db.orderItem.findMany({
    where: {
      productId: { not: null },
      order: { status: { notIn: ["CANCELLED", "DRAFT", "PENDING_PAYMENT", "REFUNDED"] } },
    },
    select: { qty: true, lineTotalCents: true, productId: true },
  });
  const soldProductIds = [...new Set(soldItems.map((i) => i.productId).filter((x): x is string => Boolean(x)))];
  const soldProducts = await db.product.findMany({
    where: { id: { in: soldProductIds } },
    select: { id: true, costCents: true },
  });
  const costMap = new Map(soldProducts.map((p) => [p.id, p.costCents]));
  let profitRevenue = 0;
  let profitCost = 0;
  for (const item of soldItems) {
    profitRevenue += item.lineTotalCents;
    profitCost += (costMap.get(item.productId ?? "") ?? 0) * item.qty;
  }
  const profitNet = profitRevenue - profitCost;
  const profitMargin = profitRevenue > 0 ? (profitNet / profitRevenue) * 100 : 0;

  // --- Refunds report ---
  const refundedOrders = await db.order.findMany({
    where: { status: "REFUNDED" },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: { id: true, orderNumber: true, totalCents: true, updatedAt: true },
  });
  const refundAgg = await db.order.aggregate({
    where: { status: "REFUNDED" },
    _sum: { totalCents: true },
    _count: { id: true },
  });

  // --- Top customers by spending ---
  const topCustomers = await db.order.groupBy({
    by: ["userId"],
    where: {
      userId: { not: null },
      status: { notIn: ["CANCELLED", "DRAFT", "PENDING_PAYMENT", "REFUNDED"] },
    },
    _sum: { totalCents: true },
    _count: { id: true },
    orderBy: { _sum: { totalCents: "desc" } },
    take: 10,
  });
  const topCustIds = topCustomers.map((c) => c.userId).filter((x): x is string => Boolean(x));
  const topCustUsers = await db.user.findMany({
    where: { id: { in: topCustIds } },
    select: { id: true, name: true, email: true },
  });
  const topCustMap = new Map(topCustUsers.map((u) => [u.id, u]));

  // --- Coupon / promo usage ---
  const promos = await db.promotion.findMany({
    orderBy: { usedCount: "desc" },
    take: 10,
    select: { id: true, code: true, title: true, discountType: true, discountValue: true, usedCount: true, active: true },
  });
  const couponDiscountAgg = await db.order.aggregate({
    where: {
      promoCode: { not: null },
      status: { notIn: ["CANCELLED", "DRAFT", "PENDING_PAYMENT", "REFUNDED"] },
    },
    _sum: { discountCents: true },
    _count: { id: true },
  });

  return (
    <div>
      <SectionTitle title="Reports" />

      {/* Revenue */}
      <div className={`${cardCls} mb-6 p-5`}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-zinc-900">Revenue — last 30 days</h2>
          <p className="text-lg font-bold text-zinc-900">{formatUSD(totalRev)}</p>
        </div>
        <div className="flex h-44 items-end gap-[3px]" role="img" aria-label="Revenue by day bar chart">
          {days.map((d) => (
            <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${formatUSD(d.total)}`}>
              <div
                className="w-full rounded-t bg-orange-500/90 hover:bg-orange-600"
                style={{ height: `${Math.max(d.total > 0 ? 4 : 0, (d.total / maxRev) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-[3px] text-[10px] text-zinc-500">
          {days.map((d, i) => (
            <span key={d.key} className="flex-1 text-center">
              {i % 5 === 0 ? d.label : ""}
            </span>
          ))}
        </div>
        <div className={`${tableWrapCls} mt-4 max-h-56 overflow-y-auto border-0 shadow-none`}>
          <table className={tableCls}>
            <thead className="sticky top-0">
              <tr>
                <th className={thCls}>Day</th>
                <th className={thCls}>Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[...days].reverse().map((d) => (
                <tr key={d.key}>
                  <td className={tdCls}>{d.key}</td>
                  <td className={tdCls}>{formatUSD(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low stock alert */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-1 text-base font-bold text-zinc-900">⚠️ Low stock alert</h2>
          <p className="mb-3 text-xs text-zinc-500">
            Products with {LOW_STOCK_THRESHOLD} or fewer units left — restock soon!
          </p>
          {lowStock.length === 0 ? (
            <p className="text-sm text-green-700">✅ All stocked up! Nothing running low.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Product</th>
                    <th className={thCls}>Stock</th>
                    <th className={thCls}>Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td className={tdCls}>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-medium text-zinc-900 hover:text-orange-700 hover:underline"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className={tdCls}>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            p.stock === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {p.stock === 0 ? "OUT" : `${p.stock} left`}
                        </span>
                      </td>
                      <td className={tdCls}>{formatUSD(p.stock * p.priceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 rounded-xl bg-zinc-50 p-4">
            <h3 className="text-sm font-bold text-zinc-900">📦 Total inventory</h3>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-extrabold text-zinc-900">{inventoryUnits.toLocaleString()}</span> units
              worth <span className="font-extrabold text-zinc-900">{formatUSD(inventoryValueCents)}</span>
            </p>
          </div>
        </div>

        {/* Top products */}
        <div className={`${cardCls} p-5`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-zinc-900">Top products by units sold</h2>
            <div className="flex gap-1 text-xs">
              {[
                { v: "7", label: "7d" },
                { v: "30", label: "30d" },
                { v: "90", label: "90d" },
              ].map((r) => (
                <Link
                  key={r.v}
                  href={`/admin/reports?topRange=${r.v}`}
                  className={`rounded-full px-2.5 py-1 font-semibold ${
                    String(topRange) === r.v
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
          {topItems.length === 0 ? (
            <p className="text-sm text-zinc-500">No sales yet.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Product</th>
                    <th className={thCls}>Qty</th>
                    <th className={thCls}>Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {topItems.map((t) => {
                    const p = t.productId ? topName.get(t.productId) : undefined;
                    return (
                      <tr key={t.productId ?? "none"}>
                        <td className={tdCls}>
                          {p ? (
                            <Link href={`/admin/products/${p.id}`} className="font-medium text-zinc-900 hover:text-orange-700 hover:underline">
                              {p.name}
                            </Link>
                          ) : (
                            <span className="text-zinc-500">Removed product</span>
                          )}
                        </td>
                        <td className={tdCls}>{t._sum.qty ?? 0}</td>
                        <td className={tdCls}>{formatUSD(t._sum.lineTotalCents ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Orders by status</h2>
          {byStatus.length === 0 ? (
            <p className="text-sm text-zinc-500">No orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {byStatus.map((g) => (
                <li key={g.status} className="flex items-center justify-between text-sm">
                  <Badge tone={statusTone(g.status)}>{g.status}</Badge>
                  <span className="font-semibold text-zinc-800">{g._count.status}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mb-3 mt-8 text-base font-bold text-zinc-900">Signups — last 14 days</h2>
          <div className="flex h-28 items-end gap-1" role="img" aria-label="Signups by day bar chart">
            {sdays.map((d) => (
              <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.count} signup(s)`}>
                <div
                  className="w-full rounded-t bg-zinc-700/80"
                  style={{ height: `${Math.max(d.count > 0 ? 6 : 0, (d.count / maxSignups) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 text-[10px] text-zinc-500">
            {sdays.map((d, i) => (
              <span key={d.key} className="flex-1 text-center">
                {i % 2 === 0 ? d.label : ""}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Generated {fmtDate(now)} · aggregates only, no personal data.
          </p>
        </div>
      </div>

      {/* Second row: profit, refunds, customers, coupons */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profit report */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-1 text-base font-bold text-zinc-900">💸 Profit report</h2>
          <p className="mb-3 text-xs text-zinc-500">Revenue minus cost of goods sold (completed orders).</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Revenue</p>
              <p className="text-lg font-extrabold text-zinc-900">{formatUSD(profitRevenue)}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Cost</p>
              <p className="text-lg font-extrabold text-zinc-900">{formatUSD(profitCost)}</p>
            </div>
            <div className={`rounded-xl p-3 ${profitNet >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-xs text-zinc-500">Profit</p>
              <p className={`text-lg font-extrabold ${profitNet >= 0 ? "text-green-700" : "text-red-700"}`}>
                {formatUSD(profitNet)}
              </p>
              <p className="text-xs text-zinc-500">{profitMargin.toFixed(1)}% margin</p>
            </div>
          </div>
          {profitCost === 0 && profitRevenue > 0 && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠️ Product costs are 0 — set <code>cost</code> via bulk upload or product edit for accurate profit.
            </p>
          )}
        </div>

        {/* Refunds */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-1 text-base font-bold text-zinc-900">🔄 Returns & refunds</h2>
          <p className="mb-3 text-xs text-zinc-500">
            <span className="font-extrabold text-zinc-900">{refundAgg._count.id}</span> refunded ·{" "}
            <span className="font-extrabold text-zinc-900">{formatUSD(refundAgg._sum.totalCents ?? 0)}</span> total
          </p>
          {refundedOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">No refunds yet. 🎉</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Order</th>
                    <th className={thCls}>Amount</th>
                    <th className={thCls}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {refundedOrders.map((o) => (
                    <tr key={o.id}>
                      <td className={tdCls}>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td className={tdCls}>{formatUSD(o.totalCents)}</td>
                      <td className={tdCls}>{fmtDate(o.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">👤 Top customers</h2>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-zinc-500">No customer orders yet.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Customer</th>
                    <th className={thCls}>Orders</th>
                    <th className={thCls}>Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {topCustomers.map((c) => {
                    const u = c.userId ? topCustMap.get(c.userId) : undefined;
                    return (
                      <tr key={c.userId ?? "guest"}>
                        <td className={tdCls}>
                          {u ? (
                            <Link href={`/admin/customers/${u.id}`} className="font-medium hover:underline">
                              {u.name ?? u.email}
                            </Link>
                          ) : (
                            <span className="text-zinc-500">Guest</span>
                          )}
                        </td>
                        <td className={tdCls}>{c._count.id}</td>
                        <td className={tdCls}>{formatUSD(c._sum.totalCents ?? 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Coupon usage */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-1 text-base font-bold text-zinc-900">🏷️ Coupon usage</h2>
          <p className="mb-3 text-xs text-zinc-500">
            <span className="font-extrabold text-zinc-900">{couponDiscountAgg._count.id}</span> orders used a
            coupon · <span className="font-extrabold text-zinc-900">{formatUSD(couponDiscountAgg._sum.discountCents ?? 0)}</span> total
            discounts given
          </p>
          {promos.length === 0 ? (
            <p className="text-sm text-zinc-500">No promotions yet.</p>
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Code</th>
                    <th className={thCls}>Discount</th>
                    <th className={thCls}>Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {promos.map((p) => (
                    <tr key={p.id}>
                      <td className={tdCls}>
                        <span className="font-mono font-bold">{p.code ?? "auto"}</span>{" "}
                        <span className="text-xs text-zinc-500">{p.title}</span>{" "}
                        {!p.active && <Badge tone="zinc">off</Badge>}
                      </td>
                      <td className={tdCls}>
                        {p.discountType === "PERCENT" ? `${p.discountValue}%` : formatUSD(p.discountValue)}
                      </td>
                      <td className={tdCls}>{p.usedCount}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
