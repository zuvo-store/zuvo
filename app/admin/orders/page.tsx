export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { Badge, SectionTitle } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";
import { requireAdminPage } from "@/lib/auth";

const PAGE_SIZE = 25;

const STATUS_CARDS = [
  { icon: "⏳", label: "Pending payment", val: "PENDING_PAYMENT" },
  { icon: "✅", label: "Confirmed", val: "CONFIRMED" },
  { icon: "🔄", label: "Processing", val: "PROCESSING" },
  { icon: "🚚", label: "Shipped", val: "SHIPPED" },
  { icon: "✔️", label: "Delivered", val: "DELIVERED" },
  { icon: "❌", label: "Cancelled", val: "CANCELLED" },
  { icon: "↩️", label: "Refunded", val: "REFUNDED" },
] as const;
const VALID_STATUSES = [...STATUS_CARDS.map((c) => c.val), "DRAFT"] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const rawStatus = qp(sp, "status") ?? "";
  const status = (VALID_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "";
  const page = pageNumber(sp);

  const where = status ? { status } : {};
  const [total, orders, statusGroups] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true }, _sum: { totalCents: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const agg: Record<string, { count: number; sum: number }> = {};
  for (const g of statusGroups) agg[g.status] = { count: g._count._all, sum: g._sum.totalCents ?? 0 };
  const get = (key: string) => agg[key] ?? { count: 0, sum: 0 };
  const grandCount = statusGroups.reduce((a, g) => a + g._count._all, 0);
  const grandSum = statusGroups.reduce((a, g) => a + (g._sum.totalCents ?? 0), 0);

  // Clicking a card filters by that status; clicking the active card clears it.
  const cardHref = (val: string) => (status === val ? "/admin/orders" : `/admin/orders?status=${val}`);

  const cards = [
    { icon: "📦", label: "Total orders", count: grandCount, sum: grandSum, href: "/admin/orders", active: status === "" },
    ...STATUS_CARDS.map((c) => ({ icon: c.icon, label: c.label, ...get(c.val), href: cardHref(c.val), active: status === c.val })),
  ];

  return (
    <div>
      <SectionTitle title="Orders" />
      <p className="mb-4 text-sm text-zinc-500">
        {total} order{total === 1 ? "" : "s"}
        {status ? ` — status: ${status}` : ""}
        {status && (
          <Link href="/admin/orders" className="ml-2 font-bold text-orange-700 hover:underline">
            Clear ✕
          </Link>
        )}
      </p>

      {grandCount > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {cards.map((c) => {
            const inner = (
              <div className={`h-full rounded-3xl bg-white p-4 shadow-sm ring-1 transition ${
                c.active ? "ring-2 ring-orange-500" : "ring-zinc-100 hover:shadow-md"
              }`}>
                <span className="text-xl">{c.icon}</span>
                <p className="mt-2 text-lg font-extrabold text-zinc-900">
                  {c.count.toLocaleString()}
                </p>
                <p className="text-xs font-medium text-zinc-500">{c.label}</p>
                <p className="text-xs font-bold text-zinc-700">{formatUSD(c.sum)}</p>
              </div>
            );
            return (
              <Link key={c.label} href={c.href} className="block h-full" scroll={false}>
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState title="No orders" message="No orders match this filter." />
      ) : (
        <div className={tableWrapCls}>
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Order</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Items</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Payment</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className={tdCls}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-orange-700 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className={tdCls}>
                    {o.user ? (
                      <span>
                        {o.user.name}
                        <span className="block text-xs text-zinc-500">{o.user.email}</span>
                      </span>
                    ) : (
                      <span>{o.guestName ?? "Guest"}</span>
                    )}
                  </td>
                  <td className={tdCls}>{o._count.items}</td>
                  <td className={tdCls}>{formatUSD(o.totalCents)}</td>
                  <td className={tdCls}>
                    <Badge tone={statusTone(o.paymentStatus)}>{o.paymentStatus}</Badge>
                  </td>
                  <td className={tdCls}>
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </td>
                  <td className={tdCls}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/orders" />
    </div>
  );
}
