export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getOrCreateDraftOrder } from "@/lib/checkout";
import { getGiftWrapCents } from "@/lib/settings";
import { db } from "@/lib/db";
import { formatUSD } from "@/lib/money";
import CheckoutSteps from "@/components/CheckoutSteps";
import CheckoutForm from "./CheckoutForm";
import type { SavedAddress } from "./CheckoutForm";

export default async function CheckoutPage() {
  const cart = await getCart();
  if (cart.lines.length === 0) redirect("/cart");

  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=" + encodeURIComponent("/checkout"));
  const draft = await getOrCreateDraftOrder();
  const giftWrapCents = await getGiftWrapCents();

  const contactJson = (draft.contactJson ?? {}) as { name?: string; email?: string; phone?: string };
  const addressJson = (draft.addressJson ?? {}) as {
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    apartment?: string;
    postalCode?: string;
  };

  const saved: SavedAddress[] = user
    ? (
        await db.address.findMany({
          where: { userId: user.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        })
      ).map((a) => ({
        id: a.id,
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        country: a.country,
        state: a.state,
        city: a.city,
        street: a.street,
        apartment: a.apartment,
        postalCode: a.postalCode,
        isDefault: a.isDefault,
      }))
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Checkout</h1>
      <div className="mb-8">
        <CheckoutSteps current={1} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <CheckoutForm
        initialContact={{
          name: contactJson.name ?? user?.name ?? "",
          email: contactJson.email ?? user?.email ?? "",
          phone: contactJson.phone ?? "",
        }}
        initialAddress={{
          country: addressJson.country ?? "",
          state: addressJson.state ?? "",
          city: addressJson.city ?? "",
          street: addressJson.street ?? "",
          apartment: addressJson.apartment ?? "",
          postalCode: addressJson.postalCode ?? "",
        }}
        savedAddresses={saved}
        initialDeliveryMethod={draft.deliveryMethod === "EXPRESS" ? "EXPRESS" : "STANDARD"}
        initialPromoCode={draft.promoCode ?? ""}
        initialGiftWrap={draft.giftWrap}
        initialGiftMessage={draft.giftMessage ?? ""}
        giftWrapCents={giftWrapCents}
      />
        </div>
        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 lg:sticky lg:top-24">
          <h2 className="mb-4 text-base font-extrabold text-zinc-900">
            Order summary ({cart.count} item{cart.count === 1 ? "" : "s"})
          </h2>
          <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
            {cart.lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-xs text-zinc-400">
                  {l.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "📦"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-800">{l.name}</p>
                  <p className="text-xs text-zinc-500">Qty {l.qty}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-zinc-900">{formatUSD(l.lineTotalCents)}</p>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-100 pt-3 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="font-bold text-zinc-900">{formatUSD(cart.subtotalCents)}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">Shipping & discounts calculated at next step.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
