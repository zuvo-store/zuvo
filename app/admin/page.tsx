export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls, SectionTitle, Badge } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import DashboardCards from "@/components/admin/DashboardCards";
import { requireAdminPage } from "@/lib/auth";
import {
  fmtDate,
  statusTone,
  tableWrapCls,
  tableCls,
  thCls,
  tdCls,
} from "./_helpers";

type SP = { from?: string; to?: string; preset?: string };

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? fallback : d;
}
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;

  // --- Date range ---
  const now = new Date();
  const preset = sp.preset ?? (sp.from || sp.to ? "custom" : "30d");
  let from: Date, to: Date;
  if (preset === "today") {
    from = startOfDay(now); to = endOfDay(now);
  } else if (preset === "7d") {
    from = startOfDay(new Date(now.getTime() - 6 * 864e5)); to = endOfDay(now);
  } else if (preset === "all") {
    from = new Date("2020-01-01"); to = endOfDay(now);
  } else if (preset === "custom" && (sp.from || sp.to)) {
    from = startOfDay(parseDate(sp.from, new Date(now.getTime() - 29 * 864e5)));
    to = endOfDay(parseDate(sp.to, now));
    if (from > to) [from, to] = [startOfDay(to), endOfDay(from)];
  } else {
    from = startOfDay(new Date(now.getTime() - 29 * 864e5)); to = endOfDay(now);
  }
  const rangeDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 864e5) + 1);
  // Previous equal-length period for comparison
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - rangeDays * 864e5);

  const inRange = { gte: from, lte: to };
  const inPrev = { gte: prevFrom, lte: prevTo };

  const [
    rev, revPrev,
    orders, ordersPrev,
    newCustomers,
    byStatus, lowStock, recent,
    topProducts, dailyRev, catItems,
    revAgg, largest, refundAgg, newCustList,
  ] = await Promise.all([
    db.payment.aggregate({ _sum: { amountCents: true }, where: { status: "SUCCEEDED", createdAt: inRange } }),
    db.payment.aggregate({ _sum: { amountCents: true }, where: { status: "SUCCEEDED", createdAt: inPrev } }),
    db.order.count({ where: { createdAt: inRange, status: { not: "DRAFT" } } }),
    db.order.count({ where: { createdAt: inPrev, status: { not: "DRAFT" } } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: inRange } }),
    db.order.groupBy({ by: ["status"], _count: { status: true }, where: { createdAt: inRange, status: { not: "DRAFT" } } }),
    db.product.findMany({
      where: { stock: { lt: 10 } },
      orderBy: { stock: "asc" },
      take: 8,
      include: { category: { select: { name: true } } },
    }),
    db.order.findMany({
      where: { createdAt: inRange, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    db.orderItem.groupBy({
      by: ["productId", "name"],
      _sum: { lineTotalCents: true, qty: true },
      where: { order: { createdAt: inRange, status: { notIn: ["DRAFT", "CANCELLED", "REFUNDED"] } } },
      orderBy: { _sum: { lineTotalCents: "desc" } },
      take: 5,
    }),
    db.payment.findMany({
      where: { status: "SUCCEEDED", createdAt: inRange },
      select: { amountCents: true, createdAt: true },
    }),
    db.orderItem.findMany({
      where: { order: { createdAt: inRange, status: { notIn: ["DRAFT", "CANCELLED", "REFUNDED"] } } },
      select: {
        lineTotalCents: true,
        product: { select: { category: { select: { name: true } } } },
      },
      take: 5000,
    }),
    db.order.aggregate({
      _sum: { subtotalCents: true, discountCents: true, shippingCents: true, giftWrapCents: true, zuzuDiscountCents: true },
      _min: { totalCents: true },
      _max: { totalCents: true },
      _avg: { totalCents: true },
      where: { createdAt: inRange, status: { notIn: ["DRAFT", "CANCELLED", "REFUNDED"] } },
    }),
    db.order.findMany({
      where: { createdAt: inRange, status: { notIn: ["DRAFT", "CANCELLED", "REFUNDED"] } },
      orderBy: { totalCents: "desc" },
      take: 5,
      select: {
        id: true, orderNumber: true, totalCents: true, status: true, createdAt: true,
        user: { select: { name: true } }, guestName: true,
        _count: { select: { items: true } },
      },
    }),
    db.payment.aggregate({
      _sum: { amountCents: true },
      where: { status: "REFUNDED", createdAt: inRange },
    }),
    db.user.findMany({
      where: { role: "CUSTOMER", createdAt: inRange },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, name: true, email: true, createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const revenue = rev._sum.amountCents ?? 0;
  const revenuePrev = revPrev._sum.amountCents ?? 0;
  const avgOrder = orders > 0 ? Math.round(revenue / orders) : 0;

  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const kpis = [
    { label: "Revenue", value: formatUSD(revenue), icon: "💰", delta: pct(revenue, revenuePrev) },
    { label: "Orders", value: String(orders), icon: "🛒", delta: pct(orders, ordersPrev) },
    { label: "Avg. order value", value: formatUSD(avgOrder), icon: "🧾", delta: null as number | null },
    { label: "New customers", value: String(newCustomers), icon: "👥", delta: null as number | null },
  ];

  // Revenue breakdown for the modal
  const refundedSum = refundAgg._sum.amountCents ?? 0;
  const revenueBreakdown = {
    productRevenue: revAgg._sum.subtotalCents ?? 0,
    shipping: revAgg._sum.shippingCents ?? 0,
    giftWrap: revAgg._sum.giftWrapCents ?? 0,
    discounts: (revAgg._sum.discountCents ?? 0) + (revAgg._sum.zuzuDiscountCents ?? 0),
    grossCollected: revenue,
    refunded: refundedSum,
    netRevenue: revenue - refundedSum,
    pendingRefund: 0, // computed below if needed
  };

  const statusGroups = byStatus.map((g) => ({ status: g.status, count: g._count.status }));
  const toRecentOrder = (o: { id: string; orderNumber: string; totalCents: number; status: string; createdAt: Date; user: { name: string } | null; guestName: string | null; _count: { items: number } }) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    totalCents: o.totalCents,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    customerName: o.user?.name ?? o.guestName ?? "Guest",
    itemCount: o._count.items,
  });
  const modalRecent = recent.map(toRecentOrder);
  const modalLargest = largest.map(toRecentOrder);
  const modalCustomers = newCustList.map((c) => ({
    id: c.id, name: c.name, email: c.email,
    createdAt: c.createdAt.toISOString(), orderCount: c._count.orders,
  }));
  const modalOrderStats = {
    min: revAgg._min.totalCents ?? 0,
    max: revAgg._max.totalCents ?? 0,
    avg: Math.round(revAgg._avg.totalCents ?? 0),
  };
  const fromLabel = from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const toLabel = to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Daily revenue buckets for the chart
  const buckets = Math.min(rangeDays, 31);
  const dayMs = 864e5;
  const chartStart = startOfDay(new Date(to.getTime() - (buckets - 1) * dayMs));
  const daily: { label: string; cents: number }[] = Array.from({ length: buckets }, (_, i) => {
    const d = new Date(chartStart.getTime() + i * dayMs);
    return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), cents: 0 };
  });
  for (const p of dailyRev) {
    const idx = Math.floor((startOfDay(p.createdAt).getTime() - chartStart.getTime()) / dayMs);
    if (idx >= 0 && idx < buckets) daily[idx].cents += p.amountCents;
  }
  const maxCents = Math.max(1, ...daily.map((d) => d.cents));

  // Category revenue aggregation
  const catMap = new Map<string, number>();
  for (const it of catItems) {
    const name = it.product?.category?.name ?? "Uncategorized";
    catMap.set(name, (catMap.get(name) ?? 0) + it.lineTotalCents);
  }
  const catTotal = [...catMap.values()].reduce((a, b) => a + b, 0);
  const DONUT_COLORS = ["#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];
  const catDonut = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name, cents], i) => ({ name, cents, color: DONUT_COLORS[i % DONUT_COLORS.length] }));
  const catGradient = catDonut.length
    ? (() => {
        let acc = 0;
        const parts = catDonut.map((c) => {
          const start = (acc / catTotal) * 100;
          acc += c.cents;
          const end = (acc / catTotal) * 100;
          return `${c.color} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
        });
        return `conic-gradient(${parts.join(", ")})`;
      })()
    : "";

  // Orders-by-status donut
  const statusTotal = byStatus.reduce((a, g) => a + g._count.status, 0);
  const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: "#3b82f6", PROCESSING: "#f59e0b", SHIPPED: "#8b5cf6",
    DELIVERED: "#10b981", CANCELLED: "#ef4444", REFUNDED: "#6b7280",
    PENDING_PAYMENT: "#f97316", DRAFT: "#a1a1aa",
  };
  const statusGradient = byStatus.length
    ? (() => {
        let acc = 0;
        const parts = [...byStatus]
          .sort((a, b) => b._count.status - a._count.status)
          .map((g) => {
            const start = (acc / statusTotal) * 100;
            acc += g._count.status;
            const end = (acc / statusTotal) * 100;
            return `${STATUS_COLORS[g.status] ?? "#a1a1aa"} ${start.toFixed(1)}% ${end.toFixed(1)}%`;
          });
        return `conic-gradient(${parts.join(", ")})`;
      })()
    : "";

  const presetHref = (id: string) => `/admin${id === "30d" ? "" : `?preset=${id}`}`;
  const customHref = `/admin?preset=custom&from=${isoDay(from)}&to=${isoDay(to)}`;

  return (
    <div>
      <SectionTitle title="Dashboard" />

      {/* Date filter */}
      <form
        action="/admin"
        method="get"
        className={`${cardCls} mb-6 flex flex-wrap items-end gap-3 p-4`}
      >
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active = preset === p.id || (p.id === "30d" && preset === "30d");
            const isDefault = p.id === "30d" && !sp.preset && !sp.from && !sp.to;
            return (
              <Link
                key={p.id}
                href={presetHref(p.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  active || isDefault
                    ? "bg-zinc-900 text-white shadow"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">From</span>
            <input
              type="date"
              name="from"
              defaultValue={isoDay(from)}
              max={isoDay(to)}
              className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">To</span>
            <input
              type="date"
              name="to"
              defaultValue={isoDay(to)}
              min={isoDay(from)}
              max={isoDay(new Date())}
              className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </label>
          <input type="hidden" name="preset" value="custom" />
          <button
            type="submit"
            className="rounded-xl bg-orange-500 px-5 py-1.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600"
          >
            Apply
          </button>
        </div>
        {preset === "custom" && (
          <p className="w-full text-xs text-zinc-500">
            Showing {from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" → "}
            {to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {" "}(<Link href="/admin" className="font-bold text-orange-600 hover:underline">reset</Link>)
          </p>
        )}
      </form>

      {/* KPI cards — tap for detail modals */}
      <DashboardCards
        kpis={kpis}
        revenue={revenueBreakdown}
        statusGroups={statusGroups}
        recentOrders={modalRecent}
        largestOrders={modalLargest}
        orderStats={modalOrderStats}
        customers={modalCustomers}
        fromLabel={fromLabel}
        toLabel={toLabel}
      />

      {/* Revenue chart */}
      {/* Revenue trend — trading-style line chart */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Revenue trend</h2>
      <div className={`${cardCls} p-5`}>
        {daily.every((d) => d.cents === 0) ? (
          <p className="py-6 text-center text-sm text-zinc-400">No revenue in this period.</p>
        ) : (
          (() => {
            // Nice rounded Y-axis max (1 / 2 / 2.5 / 5 × 10^n)
            const niceCeil = (v: number) => {
              if (v <= 0) return 10;
              const exp = Math.floor(Math.log10(v));
              const base = Math.pow(10, exp);
              const n = v / base;
              const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
              return nice * base;
            };
            const yMax = niceCeil(maxCents / 100) * 100;
            const W = 640, H = 260, padL = 52, padR = 14, padT = 14, padB = 30;
            const iw = W - padL - padR, ih = H - padT - padB;
            const n = daily.length;
            const px = (i: number) => (n === 1 ? padL + iw / 2 : padL + (i / (n - 1)) * iw);
            const py = (cents: number) => padT + ih * (1 - cents / yMax);
            const line = daily.map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(d.cents).toFixed(1)}`).join(" ");
            const area = `${line} L${px(n - 1).toFixed(1)},${(padT + ih).toFixed(1)} L${px(0).toFixed(1)},${(padT + ih).toFixed(1)} Z`;
            const ticks = [0, 1, 2, 3, 4].map((t) => (yMax / 4) * t);
            const xStep = n > 15 ? 3 : n > 8 ? 2 : 1;
            const gid = "revGrad";
            return (
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue trend line chart">
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* gridlines + Y labels */}
                {ticks.map((t, i) => (
                  <g key={i}>
                    <line
                      x1={padL} y1={py(t)} x2={W - padR} y2={py(t)}
                      stroke="#e4e4e7" strokeWidth="1" strokeDasharray={i === 0 ? "" : "4 4"}
                    />
                    <text x={padL - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fill="#71717a" fontWeight="600">
                      ${Math.round(t / 100)}
                    </text>
                  </g>
                ))}
                {/* area + line */}
                <path d={area} fill={`url(#${gid})`} />
                <path d={line} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {/* points */}
                {daily.map((d, i) => (
                  <g key={i}>
                    <circle cx={px(i)} cy={py(d.cents)} r="4" fill="#fff" stroke="#f97316" strokeWidth="2.5">
                      <title>{`${d.label}: ${formatUSD(d.cents)}`}</title>
                    </circle>
                  </g>
                ))}
                {/* X labels */}
                {daily.map((d, i) =>
                  i % xStep === 0 || i === n - 1 ? (
                    <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#a1a1aa">
                      {d.label}
                    </text>
                  ) : null
                )}
              </svg>
            );
          })()
        )}
      </div>

      {/* Donuts — side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="mb-3 mt-8 text-base font-bold text-zinc-900 sm:text-lg">Orders by status</h2>
          <div className={`${cardCls} p-4`}>
            {byStatus.length === 0 ? (
              <p className="text-sm text-zinc-500">No orders in this period.</p>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className="relative h-28 w-28 shrink-0 rounded-full sm:h-32 sm:w-32"
                  style={{ background: statusGradient }}
                  role="img"
                  aria-label="Orders by status chart"
                >
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-xl font-extrabold text-zinc-900">{statusTotal}</p>
                    <p className="text-[10px] font-medium text-zinc-500">orders</p>
                  </div>
                </div>
                <ul className="mt-3 w-full space-y-1.5">
                  {[...byStatus]
                    .sort((a, b) => b._count.status - a._count.status)
                    .map((g) => (
                      <li key={g.status}>
                        <Link
                          href={`/admin/orders?status=${g.status}`}
                          className="flex items-center gap-1.5 text-xs hover:opacity-80"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: STATUS_COLORS[g.status] ?? "#a1a1aa" }}
                          />
                          <span className="truncate font-medium text-zinc-700">
                            {g.status.replace(/_/g, " ")}
                          </span>
                          <span className="ml-auto font-extrabold text-zinc-900">{g._count.status}</span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 mt-8 text-base font-bold text-zinc-900 sm:text-lg">Revenue by category</h2>
          <div className={`${cardCls} p-4`}>
            {catDonut.length === 0 ? (
              <p className="text-sm text-zinc-500">No sales in this period.</p>
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className="relative h-28 w-28 shrink-0 rounded-full sm:h-32 sm:w-32"
                  style={{ background: catGradient }}
                  role="img"
                  aria-label="Revenue by category chart"
                >
                  <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-sm font-extrabold text-zinc-900">{formatUSD(catTotal)}</p>
                    <p className="text-[10px] font-medium text-zinc-500">total</p>
                  </div>
                </div>
                <ul className="mt-3 w-full space-y-1.5">
                  {catDonut.map((c) => (
                    <li key={c.name} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                      <span className="truncate font-medium text-zinc-700">{c.name}</span>
                      <span className="ml-auto shrink-0 font-extrabold text-zinc-900">
                        {formatUSD(c.cents)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Top products</h2>
          <div className={`${cardCls} p-4`}>
            {topProducts.length === 0 ? (
              <p className="text-sm text-zinc-500">No sales in this period.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {topProducts.map((t, i) => (
                  <li key={t.productId ?? i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-extrabold text-orange-700">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-zinc-900">{t.name}</p>
                        <p className="text-xs text-zinc-500">{t._sum.qty ?? 0} sold</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-zinc-900">
                      {formatUSD(t._sum.lineTotalCents ?? 0)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Low stock</h2>
          {lowStock.length === 0 ? (
            <EmptyState
              title="Stock levels are healthy"
              message="No products are below 10 units in stock."
              actionHref="/admin/inventory"
              actionLabel="Open inventory"
            />
          ) : (
            <div className={tableWrapCls}>
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Product</th>
                    <th className={thCls}>Stock</th>
                    <th className={thCls}>Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lowStock.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className={tdCls}>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="font-medium text-zinc-900 hover:text-orange-700 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <p className="text-xs text-zinc-400">{p.category.name}</p>
                      </td>
                      <td className={tdCls}>
                        <Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock}</Badge>
                      </td>
                      <td className={tdCls}>{formatUSD(p.priceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Recent orders</h2>
      {recent.length === 0 ? (
        <EmptyState title="No orders in this period" message="Try a wider date range." />
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Order</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Items</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-medium text-orange-700 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={tdCls}>
                    {o.user ? o.user.name : o.guestName ? `${o.guestName} (guest)` : "Guest"}
                  </td>
                  <td className={tdCls}>{o._count.items}</td>
                  <td className={tdCls}>{formatUSD(o.totalCents)}</td>
                  <td className={tdCls}>
                    <Badge tone={statusTone(o.status)}>{o.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className={tdCls}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 text-right">
        <Link
          href={`/admin/orders${customHref.includes("custom") ? `?from=${isoDay(from)}&to=${isoDay(to)}` : ""}`}
          className="text-sm font-bold text-orange-600 hover:text-orange-700"
        >
          View all orders →
        </Link>
      </div>
    </div>
  );
}
