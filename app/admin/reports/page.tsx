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

export default async function AdminReportsPage() {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
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

  // --- Top 10 products by qty sold (non-cancelled orders) ---
  const topItems = await db.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: { status: { notIn: ["CANCELLED", "DRAFT", "PENDING_PAYMENT"] } },
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-3 text-base font-bold text-zinc-900">Top products by units sold</h2>
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
    </div>
  );
}
