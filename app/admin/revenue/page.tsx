export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls, SectionTitle, Badge } from "@/components/ui";
import { requireAdminPage } from "@/lib/auth";
import { fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls } from "./_helpers";

type SP = { from?: string; to?: string };

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? fallback : d;
}
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}

/** Revenue breakdown: where every dollar came from and where it went. */
export default async function RevenuePage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const now = new Date();
  let from = startOfDay(parseDate(sp.from, new Date(now.getTime() - 29 * 864e5)));
  let to = endOfDay(parseDate(sp.to, now));
  if (from > to) [from, to] = [startOfDay(to), endOfDay(from)];
  const inRange = { gte: from, lte: to };

  const [orders, payments] = await Promise.all([
    db.order.findMany({
      where: { createdAt: inRange, status: { not: "DRAFT" } },
      select: {
        id: true, orderNumber: true, status: true, createdAt: true,
        subtotalCents: true, discountCents: true, shippingCents: true,
        giftWrapCents: true, zuzuDiscountCents: true, totalCents: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.payment.findMany({
      where: { createdAt: inRange },
      select: { id: true, status: true, amountCents: true, createdAt: true, order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const active = orders.filter((o) => !["CANCELLED", "REFUNDED"].includes(o.status));
  const cancelled = orders.filter((o) => ["CANCELLED", "REFUNDED"].includes(o.status));

  const sum = (arr: typeof orders, f: (o: (typeof orders)[number]) => number) =>
    arr.reduce((a, o) => a + f(o), 0);

  const productRevenue = sum(active, (o) => o.subtotalCents);
  const discounts = sum(active, (o) => o.discountCents + o.zuzuDiscountCents);
  const shipping = sum(active, (o) => o.shippingCents);
  const giftWrap = sum(active, (o) => o.giftWrapCents);
  const grossCollected = payments.filter((p) => p.status === "SUCCEEDED").reduce((a, p) => a + p.amountCents, 0);
  const refunded = payments.filter((p) => p.status === "REFUNDED").reduce((a, p) => a + p.amountCents, 0);
  const cancelledUnrefunded = sum(cancelled, (o) => o.totalCents) -
    payments.filter((p) => p.status === "REFUNDED").reduce((a, p) => a + p.amountCents, 0);
  const pendingRefund = Math.max(0, cancelledUnrefunded);
  const netRevenue = grossCollected - refunded;

  const rows = [
    { label: "🛍️ Product sales", value: productRevenue, tone: "text-zinc-900", bar: "bg-orange-500" },
    { label: "🚚 Shipping collected", value: shipping, tone: "text-zinc-900", bar: "bg-blue-500" },
    { label: "🎁 Gift wrap collected", value: giftWrap, tone: "text-zinc-900", bar: "bg-purple-500" },
    { label: "🏷️ Discounts given", value: -discounts, tone: "text-red-600", bar: "bg-red-400" },
    { label: "↩️ Refunds issued", value: -refunded, tone: "text-red-600", bar: "bg-red-500" },
  ];
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.value)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Revenue breakdown" />
        <Link href="/admin" className="text-sm font-bold text-orange-600 hover:text-orange-700">
          ← Back to dashboard
        </Link>
      </div>

      {/* Date filter */}
      <form action="/admin/revenue" method="get" className={`${cardCls} mb-6 flex flex-wrap items-end gap-2 p-4`}>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">From</span>
          <input type="date" name="from" defaultValue={isoDay(from)} max={isoDay(to)}
            className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">To</span>
          <input type="date" name="to" defaultValue={isoDay(to)} min={isoDay(from)} max={isoDay(new Date())}
            className="rounded-xl border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
        </label>
        <button type="submit"
          className="rounded-xl bg-orange-500 px-5 py-1.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600">
          Apply
        </button>
        <p className="w-full text-xs text-zinc-500">
          {from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {" → "}
          {to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </form>

      {/* Net revenue hero */}
      <div className={`${cardCls} mb-6 bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white`}>
        <p className="text-sm font-medium text-orange-100">Net revenue</p>
        <p className="mt-1 text-4xl font-extrabold">{formatUSD(netRevenue)}</p>
        <p className="mt-1 text-xs text-orange-100">
          Collected {formatUSD(grossCollected)} · refunded {formatUSD(refunded)}
          {pendingRefund > 0 && ` · ⚠️ ${formatUSD(pendingRefund)} awaiting refund (cancelled orders)`}
        </p>
      </div>

      {/* Breakdown */}
      <h2 className="mb-3 text-lg font-bold text-zinc-900">Where it came from</h2>
      <div className={`${cardCls} mb-6 p-5`}>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">{r.label}</span>
                <span className={`font-extrabold ${r.tone}`}>
                  {r.value < 0 ? "−" : "+"}{formatUSD(Math.abs(r.value))}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${r.bar}`}
                  style={{ width: `${Math.max(2, (Math.abs(r.value) / maxAbs) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {pendingRefund > 0 && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm">
            <p className="font-bold text-red-700">⚠️ {formatUSD(pendingRefund)} still needs to be refunded</p>
            <p className="text-xs text-red-600">
              Cancelled orders whose payments are still marked succeeded.{" "}
              <Link href="/admin/payments" className="font-bold underline">Review in Payments →</Link>
            </p>
          </div>
        )}
      </div>

      {/* Payments table */}
      <h2 className="mb-3 text-lg font-bold text-zinc-900">Payments in this period ({payments.length})</h2>
      {payments.length === 0 ? (
        <p className="rounded-2xl bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">No payments in this period.</p>
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Order</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.slice(0, 50).map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <span className="font-mono text-xs font-semibold">{p.order?.orderNumber ?? "—"}</span>
                  </td>
                  <td className={tdCls}><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                  <td className={tdCls}>
                    <span className={p.status === "REFUNDED" ? "text-red-600" : "font-semibold"}>
                      {p.status === "REFUNDED" ? "−" : ""}{formatUSD(p.amountCents)}
                    </span>
                  </td>
                  <td className={tdCls}>{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length > 50 && (
            <p className="px-4 py-3 text-center text-xs text-zinc-400">Showing 50 of {payments.length}</p>
          )}
        </div>
      )}
    </div>
  );
}
