export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { ORDER_STATUSES } from "@/lib/checkout";
import { btnSecondary, Badge, SectionTitle } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";
import { qp, pageNumber, fmtDate, statusTone, tableWrapCls, tableCls, thCls, tdCls, type SearchParams } from "../_helpers";
import { requireAdminPage } from "@/lib/auth";

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const sp = await searchParams;
  const status = qp(sp, "status") ?? "";
  const page = pageNumber(sp);

  const where = status ? { status } : {};
  const [total, orders] = await Promise.all([
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
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <SectionTitle title="Orders" />
      <p className="mb-4 text-sm text-zinc-500">
        {total} order{total === 1 ? "" : "s"}
        {status ? ` with status ${status}` : ""}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`${btnSecondary} px-3 py-1.5 text-xs ${status === "" ? "ring-2 ring-orange-300" : ""}`}
        >
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`${btnSecondary} px-3 py-1.5 text-xs ${status === s ? "ring-2 ring-orange-300" : ""}`}
          >
            {s}
          </Link>
        ))}
      </div>

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
