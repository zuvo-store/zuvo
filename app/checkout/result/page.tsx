export const dynamic = "force-dynamic";

import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCheckoutOwner } from "@/lib/checkout";
import { formatUSD } from "@/lib/money";
import CheckoutSteps from "@/components/CheckoutSteps";
import EmptyState from "@/components/EmptyState";
import { cardCls, btn } from "@/components/ui";
import { PendingConfirmButton } from "./ResultActions";
import Confetti from "@/components/Confetti";

const STATUS_COPY: Record<string, { tone: string; title: string; body: string }> = {
  SUCCEEDED: {
    tone: "green",
    title: "Order confirmed",
    body: "Thank you — your demo payment was successful and your order is confirmed.",
  },
  PENDING: {
    tone: "amber",
    title: "Payment pending",
    body: "Your payment is waiting for provider confirmation. Nothing has been charged.",
  },
  DECLINED: {
    tone: "red",
    title: "Payment declined",
    body: "Your payment was declined. No charge was made and your cart is preserved.",
  },
  CANCELLED: {
    tone: "amber",
    title: "Payment cancelled",
    body: "You cancelled the payment. No charge was made and your cart is preserved.",
  },
  FAILED: {
    tone: "red",
    title: "Payment failed",
    body: "A technical error occurred while processing the payment. Your cart and order summary are preserved — please try again.",
  },
};

const TONE_CLS: Record<string, string> = {
  green: "border-green-300 bg-green-50 text-green-900",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  red: "border-red-300 bg-red-50 text-red-900",
};

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; s?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  const user = await getSessionUser();

  if (!orderNumber) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="No order to show"
          message="We couldn't find an order reference. Start from your cart to place an order."
          actionHref="/cart"
          actionLabel="Go to cart"
        />
      </main>
    );
  }

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  const owner = await getCheckoutOwner();
  const owned =
    order &&
    (owner.userId ? order.userId === owner.userId : order.userId === null && order.guestToken === owner.guestToken);

  if (!order || !owned) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState
          title="Order not found"
          message="We couldn't find that order for this session."
          actionHref="/"
          actionLabel="Continue shopping"
        />
      </main>
    );
  }

  const confirmed = order.status === "CONFIRMED" && order.paymentStatus === "SUCCEEDED";
  const copy = confirmed
    ? STATUS_COPY.SUCCEEDED
    : (STATUS_COPY[order.paymentStatus] ?? {
        tone: "amber",
        title: "Order not completed",
        body: "This order is still in progress.",
      });

  const viewOrderHref = user
    ? `/account/orders/${order.id}`
    : `/track-order?order=${encodeURIComponent(order.orderNumber)}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {confirmed ? <Confetti /> : null}
      <div className="mb-8">
        <CheckoutSteps current={4} />
      </div>

      <section className={`mb-6 rounded-xl border p-6 ${TONE_CLS[copy.tone]}`}>
        <h1 className="mb-2 text-2xl font-bold">{copy.title}</h1>
        <p className="text-sm opacity-90">{copy.body}</p>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide opacity-70">Order number</p>
        <p className="font-mono text-2xl font-bold">{order.orderNumber}</p>
        {order.payments[0]?.transactionRef && (
          <p className="mt-2 text-xs opacity-70">
            Transaction ref: <span className="font-mono">{order.payments[0].transactionRef}</span>
          </p>
        )}
      </section>

      <section className={`${cardCls} mb-6`}>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Order summary</h2>
        <ul className="mb-4 divide-y divide-zinc-100">
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
                <p className="text-sm text-zinc-500">Qty: {item.qty}</p>
              </div>
              <p className="font-semibold text-zinc-900">{formatUSD(item.lineTotalCents)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-zinc-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd className="font-medium text-zinc-900">{formatUSD(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Discount</dt>
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

      {order.paymentStatus === "PENDING" && (
        <section className={`${cardCls} mb-6`}>
          <h2 className="mb-3 font-semibold text-zinc-900">Still waiting on the provider?</h2>
          <PendingConfirmButton orderNumber={order.orderNumber} />
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {confirmed ? (
          <>
            <Link href={viewOrderHref} className={btn}>
              View order
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Continue shopping
            </Link>
          </>
        ) : (
          <>
            <Link href="/checkout/payment" className={btn}>
              Try again
            </Link>
            <Link
              href="/cart"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Back to cart
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
