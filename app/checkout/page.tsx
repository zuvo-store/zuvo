export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getOrCreateDraftOrder } from "@/lib/checkout";
import { db } from "@/lib/db";
import CheckoutSteps from "@/components/CheckoutSteps";
import CheckoutForm from "./CheckoutForm";
import type { SavedAddress } from "./CheckoutForm";

export default async function CheckoutPage() {
  const cart = await getCart();
  if (cart.lines.length === 0) redirect("/cart");

  const user = await getSessionUser();
  const draft = await getOrCreateDraftOrder();

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
      />
    </main>
  );
}
