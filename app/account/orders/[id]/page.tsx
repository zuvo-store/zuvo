export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import { cardCls } from "@/components/ui";
import CancelOrderButton from "@/components/CancelOrderButton";
import OrderChat from "@/components/OrderChat";

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
    include: { items: { include: { product: { select: { slug: true } } } }, payments: { orderBy: { createdAt: "desc" } } },
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
        <div className="flex items-center gap-3">
          {["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status) && (
            <CancelOrderButton orderId={order.id} />
          )}
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
      </div>

      {timelineIdx >= 0 && (
        <section className={`${cardCls} mb-6`}>
          <h2 className="mb-4 font-semibold text-zinc-900">Delivery progress</h2>
          <ol className="flex items-start">
            {TIMELINE.map((step, i) => {
              const done = i <= timelineIdx;
              const passed = i < timelineIdx;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold shadow-md ${
                        done ? "bg-orange-500 text-white shadow-orange-500/30" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${
                        done ? "text-orange-700" : "text-zinc-400"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                  {i < TIMELINE.length - 1 && (
                    <div className="mx-1 flex flex-1 items-center sm:mx-2" aria-hidden="true">
                      <div className={`h-0.5 flex-1 rounded-full ${passed ? "bg-orange-500" : "bg-zinc-200"}`} />
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        className={`-ml-0.5 shrink-0 ${passed ? "text-orange-500" : "text-zinc-300"}`}
                      >
                        <path
                          d="M4 10h11M11 6l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className={cardCls}>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Items</h2>
          <ul className="divide-y divide-zinc-100">
            {order.items.map((item) => {
              const href = item.product?.slug ? `/product/${item.product.slug}` : null;
              const inner = (
                <>
                  {item.image ? (
                    <img src={item.image} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-zinc-100" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 group-hover:text-orange-600 group-hover:underline">{item.name}</p>
                    {item.variantLabel && <p className="text-sm text-zinc-500">{item.variantLabel}</p>}
                    <p className="text-sm text-zinc-500">
                      {item.qty} × {formatUSD(item.unitPriceCents)}
                    </p>
                  </div>
                  <p className="font-semibold text-zinc-900">{formatUSD(item.lineTotalCents)}</p>
                </>
              );
              return (
                <li key={item.id}>
                  {href ? (
                    <Link href={href} className="group flex items-center gap-4 py-3">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 py-3">{inner}</div>
                  )}
                </li>
              );
            })}
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
            {order.giftWrap && (
              <div className="flex justify-between text-pink-700">
                <dt>🎁 Gift wrap</dt>
                <dd className="font-medium">{formatUSD(order.giftWrapCents)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base">
              <dt className="font-semibold text-zinc-900">Total</dt>
              <dd className="font-bold text-zinc-900">{formatUSD(order.totalCents)}</dd>
            </div>
          </dl>
          {order.giftWrap && order.giftMessage && (
            <div className="mt-4 rounded-xl bg-pink-50 p-4 ring-1 ring-pink-100">
              <p className="text-sm font-bold text-pink-700">🎁 Your gift message</p>
              <p className="mt-1 text-sm italic text-pink-800">“{order.giftMessage}”</p>
            </div>
          )}
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
                    {p.provider === "cod" ? (
                      <p className="mt-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                        💵 Cash on Delivery — pay {formatUSD(p.amountCents)} in cash when your order arrives.
                      </p>
                    ) : p.provider === "stripe" ? (
                      <p className="mt-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">
                        💳 Paid by card via Stripe{(p.resultJson as Record<string, unknown> | null)?.stripeTestMode === true ? " (test mode)" : ""}.
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">Demo scenario: {p.scenario}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Support chat for this order */}
      <section className={`${cardCls} mt-6`}>
        <h2 className="mb-1 text-base font-extrabold text-zinc-900">💬 Chat with support</h2>
        <p className="mb-3 text-sm text-zinc-500">Questions about this order? Message us right here.</p>
        <OrderChat orderId={order.id} />
      </section>
    </main>
  );
}
