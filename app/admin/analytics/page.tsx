export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls, SectionTitle } from "@/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { AreaChart, BarChart, DonutChart } from "@/components/admin/Charts";

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DONUT_COLORS = ["#f97316", "#8b5cf6", "#06b6d4", "#22c55e", "#eab308", "#ec4899", "#6366f1"];

function Kpi({ label, value, sub, tone = "text-zinc-900" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className={cardCls + " p-5"}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdminPage();
  const now = new Date();

  // ---- Revenue per day, last 30 days ----
  const revSince = new Date(now);
  revSince.setDate(revSince.getDate() - 29);
  revSince.setHours(0, 0, 0, 0);
  const pays = await db.payment.findMany({
    where: { status: "SUCCEEDED", createdAt: { gte: revSince } },
    select: { amountCents: true, createdAt: true },
  });
  const revDays: { key: string; label: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    revDays.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  const revMap = new Map(revDays.map((d) => [d.key, d]));
  for (const p of pays) {
    const d = revMap.get(dayKey(new Date(p.createdAt)));
    if (d) d.value += p.amountCents / 100;
  }
  const totalRev = revDays.reduce((s, d) => s + d.value, 0);

  // ---- Orders per day, last 14 days ----
  const ordSince = new Date(now);
  ordSince.setDate(ordSince.getDate() - 13);
  ordSince.setHours(0, 0, 0, 0);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: ordSince }, status: { notIn: ["DRAFT", "PENDING_PAYMENT"] } },
    select: { createdAt: true, totalCents: true, status: true },
  });
  const ordDays: { key: string; label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    ordDays.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  const ordMap = new Map(ordDays.map((d) => [d.key, d]));
  for (const o of orders) {
    const d = ordMap.get(dayKey(new Date(o.createdAt)));
    if (d) d.value += 1;
  }
  const totalOrders = orders.length;
  const avgOrder = totalOrders > 0 ? orders.reduce((s, o) => s + o.totalCents, 0) / totalOrders / 100 : 0;

  // ---- Revenue by category (last 30 days) ----
  const items = await db.orderItem.findMany({
    where: {
      productId: { not: null },
      order: {
        status: { notIn: ["CANCELLED", "DRAFT", "PENDING_PAYMENT", "REFUNDED"] },
        createdAt: { gte: revSince },
      },
    },
    select: { qty: true, productId: true },
  });
  const prodIds = [...new Set(items.map((i) => i.productId).filter((x): x is string => Boolean(x)))];
  const prods = await db.product.findMany({
    where: { id: { in: prodIds } },
    select: { id: true, categoryId: true },
  });
  const prodCat = new Map(prods.map((p) => [p.id, p.categoryId]));
  const cats = await db.category.findMany({ select: { id: true, name: true } });
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  const catQty = new Map<string, number>();
  for (const it of items) {
    const cid = it.productId ? prodCat.get(it.productId) : undefined;
    if (cid) catQty.set(cid, (catQty.get(cid) ?? 0) + it.qty);
  }
  const donut = [...catQty.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cid, qty], i) => ({
      label: catName.get(cid) ?? "Other",
      value: qty,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  // ---- Top products (30d) ----
  const topById = new Map<string, number>();
  for (const it of items) {
    if (it.productId) topById.set(it.productId, (topById.get(it.productId) ?? 0) + it.qty);
  }
  const topSorted = [...topById.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topProds = await db.product.findMany({
    where: { id: { in: topSorted.map(([id]) => id) } },
    select: { id: true, name: true, priceCents: true },
  });
  const topMap = new Map(topProds.map((p) => [p.id, p]));

  // ---- Conversion: signups → orders (30d) ----
  const signups = await db.user.count({ where: { createdAt: { gte: revSince }, role: "CUSTOMER" } });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Sales Analytics"
        subtitle="Revenue, orders, and category performance — last 30 days"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Revenue (30d)" value={formatUSD(Math.round(totalRev * 100))} sub={`${pays.length} successful payments`} tone="text-orange-600" />
        <Kpi label="Orders (14d)" value={String(totalOrders)} sub="excl. drafts & pending" />
        <Kpi label="Avg. Order Value" value={formatUSD(Math.round(avgOrder * 100))} sub="last 14 days" tone="text-violet-600" />
        <Kpi label="New Customers (30d)" value={String(signups)} sub="signed up" tone="text-cyan-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className={cardCls + " p-5 lg:col-span-2"}>
          <h3 className="mb-1 text-sm font-bold text-zinc-800">Revenue — last 30 days</h3>
          <p className="mb-3 text-xs text-zinc-500">Daily successful payments (USD)</p>
          <AreaChart data={revDays} />
        </div>

        {/* Category donut */}
        <div className={cardCls + " p-5"}>
          <h3 className="mb-1 text-sm font-bold text-zinc-800">Units by Category</h3>
          <p className="mb-3 text-xs text-zinc-500">Last 30 days</p>
          {donut.length > 0 ? (
            <DonutChart data={donut} />
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400">No sales yet</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders bar chart */}
        <div className={cardCls + " p-5 lg:col-span-2"}>
          <h3 className="mb-1 text-sm font-bold text-zinc-800">Orders — last 14 days</h3>
          <p className="mb-3 text-xs text-zinc-500">Orders placed per day</p>
          <BarChart data={ordDays} />
        </div>

        {/* Top products */}
        <div className={cardCls + " p-5"}>
          <h3 className="mb-3 text-sm font-bold text-zinc-800">Top Products (30d)</h3>
          {topSorted.length > 0 ? (
            <ul className="space-y-3">
              {topSorted.map(([id, qty], i) => {
                const p = topMap.get(id);
                return (
                  <li key={id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-extrabold text-orange-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-zinc-800">{p?.name ?? "Removed product"}</p>
                      <p className="text-[11px] text-zinc-500">{qty} sold{p ? ` • ${formatUSD(p.priceCents)}` : ""}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-zinc-400">No sales yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
