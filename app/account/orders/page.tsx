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

const STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-zinc-400",
  PENDING_PAYMENT: "bg-amber-500",
  CONFIRMED: "bg-green-500",
  PROCESSING: "bg-blue-500",
  SHIPPED: "bg-purple-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-zinc-400",
  REFUNDED: "bg-zinc-400",
};

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id, status: { not: "DRAFT" } },
    include: {
      items: {
        select: { id: true, name: true, image: true, qty: true, variantLabel: true },
        take: 4,
      },
      _count: { select: { items: true } },
    },
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
        {orders.map((o) => {
          const shown = o.items.slice(0, 3);
          const extra = o._count.items - shown.length;
          return (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className={`${cardCls} block p-4 transition hover:shadow-md sm:p-5`}
              >
                {/* Top row: products + total */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {/* Thumbnails */}
                    <div className="flex shrink-0 -space-x-3">
                      {shown.map((it) =>
                        it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={it.id}
                            src={it.image}
                            alt=""
                            className="h-14 w-14 rounded-xl border-2 border-white bg-zinc-100 object-cover shadow-sm"
                          />
                        ) : (
                          <span
                            key={it.id}
                            className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-white bg-zinc-100 text-lg shadow-sm"
                          >
                            📦
                          </span>
                        )
                      )}
                    </div>
                    {/* Names */}
                    <div className="min-w-0">
                      {shown.map((it) => (
                        <p key={it.id} className="truncate text-sm font-semibold text-zinc-900">
                          {it.name}
                          {it.qty > 1 ? <span className="font-normal text-zinc-500"> × {it.qty}</span> : null}
                        </p>
                      ))}
                      {extra > 0 ? (
                        <p className="text-xs font-medium text-zinc-500">+{extra} more item(s)</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-zinc-900">{formatUSD(o.totalCents)}</p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        STATUS_TONE[o.status] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[o.status] ?? "bg-zinc-400"}`}
                      />
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                {/* Bottom row: meta + action */}
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                  <p className="truncate text-xs text-zinc-500">
                    <span className="font-mono font-semibold text-zinc-700">{o.orderNumber}</span>
                    {" · "}
                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <span className="shrink-0 text-sm font-bold text-orange-600">
                    View details →
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
