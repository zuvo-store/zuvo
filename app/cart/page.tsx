export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { getCart, estimateShipping, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/cart";
import { formatUSD } from "@/lib/money";
import EmptyState from "@/components/EmptyState";
import { cardCls, btn } from "@/components/ui";
import CartLines from "./CartLines";

export const metadata: Metadata = { title: "Cart — ZUVO" };

export default async function CartPage() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          title="Your cart is empty"
          message="Looks like you haven't added anything yet. Browse the catalog to find something you love."
          actionHref="/search"
          actionLabel="Browse products"
        />
      </main>
    );
  }

  const itemCount = cart.lines.reduce((s, l) => s + l.qty, 0);
  const shippingCents = estimateShipping(cart.subtotalCents, "STANDARD");
  const totalCents = cart.subtotalCents + shippingCents;
  const freeShipping = cart.subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const progress = Math.min(cart.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS, 1);
  const remaining = FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Shopping cart</h1>
        <p className="text-sm text-zinc-500">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <CartLines initialLines={cart.lines} />

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className={`${cardCls} p-6`}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Order summary</h2>

            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">
                  Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                </dt>
                <dd className="font-medium text-zinc-900">{formatUSD(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Shipping (Standard)</dt>
                <dd className="font-medium text-zinc-900">
                  {shippingCents === 0 ? (
                    <span className="font-semibold text-green-700">FREE</span>
                  ) : (
                    formatUSD(shippingCents)
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-zinc-200 pt-4">
              {freeShipping ? (
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-green-700">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4 10.5l4 4 8-9"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  You&apos;ve unlocked FREE standard shipping!
                </p>
              ) : (
                <p className="mb-2 text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900">{formatUSD(remaining)}</span>{" "}
                  away from FREE shipping
                </p>
              )}
              <div
                className="h-2 overflow-hidden rounded-full bg-zinc-200"
                role="progressbar"
                aria-valuenow={Math.round(progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward free shipping"
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    freeShipping ? "bg-green-600" : "bg-orange-500"
                  }`}
                  style={{ width: `${freeShipping ? 100 : Math.floor(progress * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-4">
              <span className="font-semibold text-zinc-900">Total</span>
              <span className="text-xl font-extrabold text-zinc-900">
                {formatUSD(totalCents)}
              </span>
            </div>

            <Link href="/checkout" className={`${btn} mt-6 w-full`}>
              Proceed to checkout
            </Link>
            <Link
              href="/"
              className="mt-3 block rounded-xl border border-zinc-300 px-4 py-2.5 text-center text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Continue shopping
            </Link>

            <ul className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
              <li className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-green-600">
                  <path d="M10 1.5L3 4v5.5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V4l-7-2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M7.5 10l2 2 3.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Secure demo checkout — no real payment
              </li>
              <li className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-green-600">
                  <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="7" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="17" cy="17.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Standard delivery 5–8 business days
              </li>
              <li className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-green-600">
                  <path d="M4 9V6a8 8 0 0112 0v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <rect x="3" y="9" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Shipping estimated — final totals at checkout
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
