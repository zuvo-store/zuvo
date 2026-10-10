export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import EmptyState from "@/components/EmptyState";
import { cardCls } from "@/components/ui";

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  REFUNDED: "bg-zinc-200 text-zinc-700",
};

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id, status: { not: "DRAFT" } },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (orders.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          title="No orders yet"
          message="When you place an order it will show up here. You can also look up a guest order with its order number."
          actionHref="/search"
          actionLabel="Start shopping"
        />
        <p className="mt-6 text-center text-sm text-zinc-500">
          Looking for a guest order?{" "}
          <Link href="/track-order" className="font-medium text-orange-600 hover:text-orange-700">
            Track it here
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Your orders</h1>
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/account/orders/${o.id}`} className={`${cardCls} block transition hover:shadow-md`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono font-semibold text-zinc-900">{o.orderNumber}</p>
                  <p className="text-sm text-zinc-500">
                    {new Date(o.createdAt).toLocaleString("en-US")} · {o._count.items} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-zinc-900">{formatUSD(o.totalCents)}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                      STATUS_TONE[o.status] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
