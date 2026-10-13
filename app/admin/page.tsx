export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls, SectionTitle, Badge } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
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
  ]);

  const revenue = rev._sum.amountCents ?? 0;
  const revenuePrev = revPrev._sum.amountCents ?? 0;
  const avgOrder = orders > 0 ? Math.round(revenue / orders) : 0;

  const pct = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const kpis = [
    { label: "Revenue", value: formatUSD(revenue), icon: "💰", delta: pct(revenue, revenuePrev), invert: false },
    { label: "Orders", value: String(orders), icon: "🛒", delta: pct(orders, ordersPrev), invert: false },
    { label: "Avg. order value", value: formatUSD(avgOrder), icon: "🧾", delta: null as number | null, invert: false },
    { label: "New customers", value: String(newCustomers), icon: "👥", delta: null as number | null, invert: false },
  ];

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${cardCls} p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">{k.label}</p>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold text-zinc-900">{k.value}</p>
            {k.delta !== null && (
              <p className={`mt-1 text-xs font-bold ${k.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}% vs previous period
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Revenue trend</h2>
      <div className={`${cardCls} p-5`}>
        {daily.every((d) => d.cents === 0) ? (
          <p className="py-6 text-center text-sm text-zinc-400">No revenue in this period.</p>
        ) : (
          <div>
            <div className="flex h-40 items-end gap-1.5">
              {daily.map((d, i) => (
                <div key={i} className="group relative flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-orange-500 to-amber-400 transition group-hover:from-orange-600 group-hover:to-amber-500"
                    style={{ height: `${Math.max(3, (d.cents / maxCents) * 100)}%` }}
                    title={`${d.label}: ${formatUSD(d.cents)}`}
                  />
                  <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-[11px] font-bold text-white group-hover:block">
                    {formatUSD(d.cents)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              {daily.map((d, i) => (
                <p key={i} className="flex-1 truncate text-center text-[10px] text-zinc-400">
                  {buckets > 14 && i % 2 === 1 ? "" : d.label}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders by status — donut */}
        <div>
          <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Orders by status</h2>
          <div className={`${cardCls} p-5`}>
            {byStatus.length === 0 ? (
              <p className="text-sm text-zinc-500">No orders in this period.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div
                  className="relative h-36 w-36 shrink-0 rounded-full"
                  style={{ background: statusGradient }}
                  role="img"
                  aria-label="Orders by status chart"
                >
                  <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-2xl font-extrabold text-zinc-900">{statusTotal}</p>
                    <p className="text-[11px] font-medium text-zinc-500">orders</p>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {[...byStatus]
                    .sort((a, b) => b._count.status - a._count.status)
                    .map((g) => (
                      <li key={g.status}>
                        <Link
                          href={`/admin/orders?status=${g.status}`}
                          className="flex items-center gap-2 text-sm hover:opacity-80"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-sm"
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

          {/* Top products */}
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

        {/* Low stock */}
        <div>
          <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Revenue by category</h2>
          <div className={`${cardCls} p-5`}>
            {catDonut.length === 0 ? (
              <p className="text-sm text-zinc-500">No sales in this period.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div
                  className="relative h-36 w-36 shrink-0 rounded-full"
                  style={{ background: catGradient }}
                  role="img"
                  aria-label="Revenue by category chart"
                >
                  <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
                    <p className="text-lg font-extrabold text-zinc-900">{formatUSD(catTotal)}</p>
                    <p className="text-[11px] font-medium text-zinc-500">total</p>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {catDonut.map((c) => (
                    <li key={c.name} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: c.color }} />
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
