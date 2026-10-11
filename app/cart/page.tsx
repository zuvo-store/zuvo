export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import { getCart, estimateShipping, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/cart";

export const metadata: Metadata = { title: "Cart — ZUVO" };
import { formatUSD } from "@/lib/money";
import EmptyState from "@/components/EmptyState";
import { cardCls, btn } from "@/components/ui";
import CartLines from "./CartLines";

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

  const shippingCents = estimateShipping(cart.subtotalCents, "STANDARD");
  const totalCents = cart.subtotalCents + shippingCents;
  const freeShipping = cart.subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
  const progress = Math.min(cart.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS, 1);
  const remaining = FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <CartLines initialLines={cart.lines} />
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className={cardCls}>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-600">Subtotal</dt>
                <dd className="font-medium text-zinc-900">{formatUSD(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-600">Shipping (Standard)</dt>
                <dd className="font-medium text-zinc-900">
                  {shippingCents === 0 ? "FREE" : formatUSD(shippingCents)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-zinc-200 pt-4">
              {freeShipping ? (
                <p className="mb-2 text-sm font-medium text-green-700">
                  You have unlocked FREE standard shipping.
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
                  className="h-full rounded-full bg-orange-500 transition-all"
                  style={{ width: `${freeShipping ? 100 : Math.floor(progress * 100)}%` }}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4">
              <span className="font-semibold text-zinc-900">Total</span>
              <span className="text-lg font-bold text-zinc-900">{formatUSD(totalCents)}</span>
            </div>
            <Link href="/checkout" className={`${btn} mt-6 w-full`}>
              Proceed to checkout
            </Link>
            <Link
              href="/"
              className="mt-3 block rounded-xl border border-zinc-300 px-4 py-2.5 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Continue shopping
            </Link>
            <p className="mt-4 text-xs text-zinc-500">
              Shipping is estimated. Final totals are calculated at checkout.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
