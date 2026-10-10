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

export default async function AdminDashboard() {
  await requireAdminPage(); // must run before any data fetch (see lib/auth.ts)
  const [revenue, orderCount, customerCount, productCount, byStatus, lowStock, recent] =
    await Promise.all([
      db.payment.aggregate({
        _sum: { amountCents: true },
        where: { status: "SUCCEEDED" },
      }),
      db.order.count(),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.product.count(),
      db.order.groupBy({ by: ["status"], _count: { status: true } }),
      db.product.findMany({
        where: { stock: { lt: 10 } },
        orderBy: { stock: "asc" },
        take: 8,
        include: { category: { select: { name: true } } },
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

  const stats = [
    { label: "Total revenue", value: formatUSD(revenue._sum.amountCents ?? 0) },
    { label: "Orders", value: String(orderCount) },
    { label: "Customers", value: String(customerCount) },
    { label: "Products", value: String(productCount) },
  ];

  return (
    <div>
      <SectionTitle title="Dashboard" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`${cardCls} p-5`}>
            <p className="text-sm font-medium text-zinc-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Orders by status</h2>
      <div className="flex flex-wrap gap-2">
        {byStatus.length === 0 ? (
          <p className="text-sm text-zinc-500">No orders yet.</p>
        ) : (
          byStatus.map((g) => (
            <Link
              key={g.status}
              href={`/admin/orders?status=${g.status}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:border-orange-300"
            >
              <Badge tone={statusTone(g.status)}>{g.status}</Badge>
              <span className="font-semibold text-zinc-800">{g._count.status}</span>
            </Link>
          ))
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
                <th className={thCls}>Category</th>
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
                  </td>
                  <td className={tdCls}>{p.category.name}</td>
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

      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Recent orders</h2>
      {recent.length === 0 ? (
        <EmptyState title="No orders yet" message="Orders will appear here once customers check out." />
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
                    <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  </td>
                  <td className={tdCls}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
