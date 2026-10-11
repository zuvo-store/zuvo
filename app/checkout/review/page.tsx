export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateDraftOrder, rebuildDraftOrder } from "@/lib/checkout";
import { formatUSD } from "@/lib/money";
import CheckoutSteps from "@/components/CheckoutSteps";
import { cardCls, btn } from "@/components/ui";

export default async function ReviewPage() {
  const draft = await getOrCreateDraftOrder();
  let order;
  try {
    order = await rebuildDraftOrder(draft.id);
  } catch {
    redirect("/checkout");
  }
  if (!order.contactJson || !order.addressJson) redirect("/checkout");

  const contact = order.contactJson as { name?: string; email?: string; phone?: string };
  const address = order.addressJson as {
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    apartment?: string;
    postalCode?: string;
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Review your order</h1>
      <div className="mb-8">
        <CheckoutSteps current={2} />
      </div>

      <section className={`${cardCls} mb-6`}>
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
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <section className={cardCls}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Contact</h2>
            <Link href="/checkout" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Edit
            </Link>
          </div>
          <p className="text-sm text-zinc-700">{contact.name}</p>
          <p className="text-sm text-zinc-700">{contact.email}</p>
          {contact.phone && <p className="text-sm text-zinc-700">{contact.phone}</p>}
        </section>
        <section className={cardCls}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Shipping</h2>
            <Link href="/checkout" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Edit
            </Link>
          </div>
          <p className="text-sm text-zinc-700">{address.street}</p>
          {address.apartment && <p className="text-sm text-zinc-700">{address.apartment}</p>}
          <p className="text-sm text-zinc-700">
            {address.city},{" "}{address.state} {address.postalCode}
          </p>
          <p className="text-sm text-zinc-700">{address.country}</p>
        </section>
        <section className={cardCls}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Delivery</h2>
            <Link href="/checkout" className="text-sm font-medium text-orange-600 hover:text-orange-700">
              Edit
            </Link>
          </div>
          <p className="text-sm text-zinc-700">{order.deliveryLabel ?? order.deliveryMethod}</p>
          {order.promoCode && (
            <p className="mt-1 text-sm text-zinc-700">
              Promo: <span className="font-semibold uppercase">{order.promoCode}</span>
            </p>
          )}
        </section>
      </div>

      <section className={`${cardCls} mb-6`}>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Totals</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600">Subtotal</dt>
            <dd className="font-medium text-zinc-900">{formatUSD(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Promo discount{order.promoCode ? ` (${order.promoCode})` : ""}</dt>
              <dd className="font-medium">−{formatUSD(order.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-zinc-600">Shipping</dt>
            <dd className="font-medium text-zinc-900">
              {order.shippingCents === 0 ? "FREE" : formatUSD(order.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-3 text-base">
            <dt className="font-semibold text-zinc-900">Total</dt>
            <dd className="font-bold text-zinc-900">{formatUSD(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/checkout/payment" className={btn}>
          Continue to payment
        </Link>
        <Link
          href="/cart"
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Back to cart
        </Link>
      </div>
    </main>
  );
}
