"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/money";
import { btn, inputCls, Field, FormError, cardCls } from "@/components/ui";

const PIPELINE = [
  "DRAFT",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

const TERMINAL: Record<string, string> = {
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

function statusLabel(s: string): string {
  if (TERMINAL[s]) return TERMINAL[s];
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

type TrackedOrder = {
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  createdAt?: string;
  deliveryLabel?: string | null;
  deliveryMethod?: string | null;
  items?: {
    name: string;
    variantLabel?: string | null;
    image?: string | null;
    qty: number;
    unitPriceCents?: number;
    lineTotalCents?: number;
  }[];
  subtotalCents?: number;
  discountCents?: number;
  shippingCents?: number;
  taxCents?: number;
  totalCents?: number;
};

export default function TrackOrderForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "We could not find that order.");
      } else {
        setOrder(data.order as TrackedOrder);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const currentIndex = order ? PIPELINE.indexOf(order.status as (typeof PIPELINE)[number]) : -1;
  const isTerminal = order ? Boolean(TERMINAL[order.status]) : false;

  return (
    <div>
      <form onSubmit={onSubmit} className={`${cardCls} flex flex-col gap-4 p-5`}>
        <Field label="Order number">
          <input
            className={inputCls}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ZV-20250101-ABC123"
            required
          />
        </Field>
        <Field label="Email used for the order">
          <input
            className={inputCls}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            Guests look up orders with the email from checkout.
          </p>
        </Field>
        {error && <FormError message={error} />}
        <div>
          <button type="submit" className={btn} disabled={pending}>
            {pending ? "Looking up…" : "Track order"}
          </button>
        </div>
      </form>

      {order && (
        <div className="mt-8">
          <div className={`${cardCls} p-5`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold text-zinc-900">{order.orderNumber}</h2>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-700">
                {statusLabel(order.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Placed {order.createdAt ? new Date(order.createdAt).toLocaleString("en-US") : "—"}
              {order.deliveryLabel ? ` · ${order.deliveryLabel}` : ""}
            </p>

            {!isTerminal && currentIndex >= 0 && (
              <ol className="mt-6 flex flex-col gap-0 sm:flex-row">
                {PIPELINE.map((s, i) => {
                  const done = i < currentIndex;
                  const current = i === currentIndex;
                  return (
                    <li key={s} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-1">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          done
                            ? "bg-green-600 text-white"
                            : current
                              ? "bg-orange-500 text-white"
                              : "bg-zinc-200 text-zinc-500"
                        }`}
                      >
                        {done ? "✓" : i + 1}
                      </span>
                      <span
                        className={`pb-4 text-xs font-medium sm:pb-0 ${
                          current ? "text-orange-700" : done ? "text-zinc-700" : "text-zinc-400"
                        }`}
                      >
                        {statusLabel(s)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            {isTerminal && (
              <p className="mt-4 text-sm text-zinc-600">
                This order is {statusLabel(order.status).toLowerCase()}. No further updates expected.
              </p>
            )}
          </div>

          {order.items && order.items.length > 0 && (
            <div className={`${cardCls} mt-4 p-5`}>
              <h3 className="font-semibold text-zinc-900">Items</h3>
              <ul className="mt-3 divide-y divide-zinc-100">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-4 py-3">
                    {item.image ? (
                      <img src={item.image} alt="" aria-hidden="true" className="h-14 w-14 rounded-lg bg-zinc-100 object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-zinc-100 text-lg font-bold text-zinc-300">
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-zinc-500">{item.variantLabel}</p>
                      )}
                      <p className="text-xs text-zinc-500">Qty {item.qty}</p>
                    </div>
                    {typeof item.lineTotalCents === "number" ? (
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatUSD(item.lineTotalCents)}
                      </p>
                    ) : typeof item.unitPriceCents === "number" ? (
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatUSD(item.unitPriceCents * item.qty)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t border-zinc-100 pt-4 text-sm">
                {typeof order.subtotalCents === "number" && (
                  <div className="flex justify-between text-zinc-600">
                    <dt>Subtotal</dt>
                    <dd>{formatUSD(order.subtotalCents)}</dd>
                  </div>
                )}
                {typeof order.discountCents === "number" && order.discountCents > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <dt>Discount</dt>
                    <dd>−{formatUSD(order.discountCents)}</dd>
                  </div>
                )}
                {typeof order.shippingCents === "number" && (
                  <div className="flex justify-between text-zinc-600">
                    <dt>Shipping</dt>
                    <dd>{formatUSD(order.shippingCents)}</dd>
                  </div>
                )}
                {typeof order.taxCents === "number" && order.taxCents > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <dt>Tax</dt>
                    <dd>{formatUSD(order.taxCents)}</dd>
                  </div>
                )}
                {typeof order.totalCents === "number" && (
                  <div className="flex justify-between pt-1 text-base font-bold text-zinc-900">
                    <dt>Total</dt>
                    <dd>{formatUSD(order.totalCents)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
