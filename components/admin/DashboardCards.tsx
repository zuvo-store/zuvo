"use client";

import { useState } from "react";
import Link from "next/link";

export type RevenueBreakdown = {
  productRevenue: number;
  shipping: number;
  giftWrap: number;
  discounts: number;
  grossCollected: number;
  refunded: number;
  netRevenue: number;
  pendingRefund: number;
};
export type StatusGroup = { status: string; count: number };
export type RecentOrder = {
  id: string; orderNumber: string; totalCents: number; status: string;
  createdAt: string; customerName: string; itemCount: number;
};
export type CustomerRow = { id: string; name: string; email: string; createdAt: string; orderCount: number };

const fmt$ = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-500 hover:bg-zinc-200"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** KPI cards that open detail modals — the professional dashboard pattern. */
export default function DashboardCards({
  kpis,
  revenue,
  statusGroups,
  recentOrders,
  largestOrders,
  orderStats,
  customers,
  fromLabel,
  toLabel,
}: {
  kpis: { label: string; value: string; icon: string; delta: number | null }[];
  revenue: RevenueBreakdown;
  statusGroups: StatusGroup[];
  recentOrders: RecentOrder[];
  largestOrders: RecentOrder[];
  orderStats: { min: number; max: number; avg: number };
  customers: CustomerRow[];
  fromLabel: string;
  toLabel: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const period = `${fromLabel} → ${toLabel}`;

  const revRows = [
    { label: "🛍️ Product sales", value: revenue.productRevenue, cls: "text-zinc-900" },
    { label: "🚚 Shipping collected", value: revenue.shipping, cls: "text-zinc-900" },
    { label: "🎁 Gift wrap collected", value: revenue.giftWrap, cls: "text-zinc-900" },
    { label: "🏷️ Discounts given", value: -revenue.discounts, cls: "text-red-600" },
    { label: "↩️ Refunds issued", value: -revenue.refunded, cls: "text-red-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            onClick={() => setOpen(k.label)}
            className="rounded-3xl bg-white p-5 text-left shadow-sm ring-1 ring-zinc-100 transition hover:shadow-md hover:ring-2 hover:ring-orange-200 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">{k.label}</p>
              <span className="text-xl">{k.icon}</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold text-zinc-900">{k.value}</p>
            {k.delta !== null && (
              <p className={`mt-1 text-xs font-bold ${k.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}% vs prev
              </p>
            )}
            <p className="mt-2 text-xs font-bold text-orange-600">Tap for details →</p>
          </button>
        ))}
      </div>

      {open === "Revenue" && (
        <Modal title="💰 Revenue breakdown" onClose={() => setOpen(null)}>
          <p className="mb-3 text-xs text-zinc-500">{period}</p>
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
            <p className="text-xs font-medium text-orange-100">Net revenue</p>
            <p className="text-3xl font-extrabold">{fmt$(revenue.netRevenue)}</p>
          </div>
          <ul className="space-y-2.5">
            {revRows.map((r) => (
              <li key={r.label} className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-700">{r.label}</span>
                <span className={`font-extrabold ${r.cls}`}>
                  {r.value < 0 ? "−" : "+"}{fmt$(Math.abs(r.value))}
                </span>
              </li>
            ))}
          </ul>
          {revenue.pendingRefund > 0 && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              ⚠️ {fmt$(revenue.pendingRefund)} awaiting refund (cancelled orders)
            </p>
          )}
        </Modal>
      )}

      {open === "Orders" && (
        <Modal title="🛒 Orders" onClose={() => setOpen(null)}>
          <p className="mb-3 text-xs text-zinc-500">{period}</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {statusGroups.map((g) => (
              <Link
                key={g.status}
                href={`/admin/orders?status=${g.status}`}
                className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
              >
                {g.status.replace(/_/g, " ")} · {g.count}
              </Link>
            ))}
          </div>
          <p className="mb-2 text-sm font-bold text-zinc-800">Recent orders</p>
          <ul className="divide-y divide-zinc-100">
            {recentOrders.slice(0, 6).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-mono text-xs font-bold text-orange-700">{o.orderNumber}</p>
                    <p className="text-xs text-zinc-500">{o.customerName} · {fmtDate(o.createdAt)}</p>
                  </div>
                  <p className="text-sm font-extrabold">{fmt$(o.totalCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/admin/orders" className="mt-3 block text-center text-sm font-bold text-orange-600">
            View all orders →
          </Link>
        </Modal>
      )}

      {open === "Avg. order value" && (
        <Modal title="🧾 Order values" onClose={() => setOpen(null)}>
          <p className="mb-3 text-xs text-zinc-500">{period}</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { l: "Smallest", v: orderStats.min },
              { l: "Average", v: orderStats.avg },
              { l: "Largest", v: orderStats.max },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-zinc-50 p-3 text-center">
                <p className="text-[11px] font-medium text-zinc-500">{s.l}</p>
                <p className="text-lg font-extrabold text-zinc-900">{fmt$(s.v)}</p>
              </div>
            ))}
          </div>
          <p className="mb-2 text-sm font-bold text-zinc-800">Largest orders</p>
          <ul className="divide-y divide-zinc-100">
            {largestOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-mono text-xs font-bold text-orange-700">{o.orderNumber}</p>
                    <p className="text-xs text-zinc-500">{o.customerName}</p>
                  </div>
                  <p className="text-sm font-extrabold">{fmt$(o.totalCents)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {open === "New customers" && (
        <Modal title="👥 New customers" onClose={() => setOpen(null)}>
          <p className="mb-3 text-xs text-zinc-500">{period}</p>
          {customers.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">No new customers in this period.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {customers.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-extrabold text-orange-700">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-900">{c.name}</p>
                    <p className="truncate text-xs text-zinc-500">{c.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-zinc-700">{c.orderCount} orders</p>
                    <p className="text-[11px] text-zinc-400">{fmtDate(c.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/customers" className="mt-3 block text-center text-sm font-bold text-orange-600">
            View all customers →
          </Link>
        </Modal>
      )}
    </>
  );
}
