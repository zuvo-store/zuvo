export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls } from "@/components/ui";

const TIMELINE = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

const PAYMENT_TONE: Record<string, string> = {
  SUCCEEDED: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-zinc-200 text-zinc-700",
  UNPAID: "bg-zinc-100 text-zinc-700",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order || order.userId !== user.id) notFound();

  const contact = (order.contactJson ?? {}) as { name?: string; email?: string; phone?: string };
  const address = (order.addressJson ?? {}) as {
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    apartment?: string;
    postalCode?: string;
  };

  const timelineIdx = TIMELINE.indexOf(order.status);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/account/orders" className="mb-4 inline-block text-sm font-medium text-orange-600 hover:text-orange-700">
        ← Back to orders
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-zinc-900">{order.orderNumber}</h1>
          <p className="text-sm text-zinc-500">
            Placed {new Date(order.createdAt).toLocaleString("en-US")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            order.status === "CANCELLED" || order.status === "REFUNDED"
              ? "bg-zinc-200 text-zinc-700"
              : "bg-green-100 text-green-800"
          }`}
        >
          {order.status.replace(/_/g, " ")}
        </span>
      </div>

      {timelineIdx >= 0 && (
        <section className={`${cardCls} mb-6`}>
          <h2 className="mb-4 font-semibold text-zinc-900">Delivery progress</h2>
          <ol className="flex items-center">
            {TIMELINE.map((step, i) => {
              const done = i <= timelineIdx;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-orange-500 text-white" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="mt-1 text-xs font-medium text-zinc-600">{step}</span>
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 ${i < timelineIdx ? "bg-orange-500" : "bg-zinc-200"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Items</h2>
          <ul className="divide-y divide-zinc-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3">
                {item.image ? (
                  <img src={item.image} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-zinc-100" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900">{item.name}</p>
                  {item.variantLabel && <p className="text-sm text-zinc-500">{item.variantLabel}</p>}
                  <p className="text-sm text-zinc-500">
                    {item.qty} × {formatUSD(item.unitPriceCents)}
                  </p>
                </div>
                <p className="font-semibold text-zinc-900">{formatUSD(item.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-zinc-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600">Subtotal</dt>
              <dd className="font-medium text-zinc-900">{formatUSD(order.subtotalCents)}</dd>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</dt>
                <dd className="font-medium">−{formatUSD(order.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-600">Shipping</dt>
              <dd className="font-medium text-zinc-900">
                {order.shippingCents === 0 ? "FREE" : formatUSD(order.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base">
              <dt className="font-semibold text-zinc-900">Total</dt>
              <dd className="font-bold text-zinc-900">{formatUSD(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className={cardCls}>
            <h2 className="mb-3 font-semibold text-zinc-900">Shipping to</h2>
            {address.street ? (
              <div className="text-sm text-zinc-700">
                <p>{contact.name}</p>
                <p>{address.street}</p>
                {address.apartment && <p>{address.apartment}</p>}
                <p>
                  {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
                {contact.phone && <p>{contact.phone}</p>}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No shipping address recorded.</p>
            )}
            {order.deliveryLabel && (
              <p className="mt-2 text-sm text-zinc-600">{order.deliveryLabel}</p>
            )}
          </section>

          <section className={cardCls}>
            <h2 className="mb-3 font-semibold text-zinc-900">Payments</h2>
            {order.payments.length === 0 ? (
              <p className="text-sm text-zinc-500">No payment attempts yet.</p>
            ) : (
              <ul className="space-y-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-900">{formatUSD(p.amountCents)}</span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          PAYMENT_TONE[p.status] ?? "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(p.createdAt).toLocaleString("en-US")}
                      {p.transactionRef && (
                        <>
                          {" · "}
                          <span className="font-mono">{p.transactionRef}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">Demo scenario: {p.scenario}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
