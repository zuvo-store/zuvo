export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOrCreateDraftOrder, rebuildDraftOrder } from "@/lib/checkout";
import CheckoutSteps from "@/components/CheckoutSteps";
import PaymentClient from "./PaymentClient";

export default async function PaymentPage() {
  const draft = await getOrCreateDraftOrder();
  let order;
  try {
    order = await rebuildDraftOrder(draft.id);
  } catch {
    redirect("/cart");
  }
  if (!order.contactJson || !order.addressJson) redirect("/checkout");
  if (order.totalCents <= 0) redirect("/checkout");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Payment</h1>
      <div className="mb-8">
        <CheckoutSteps current={3} />
      </div>
      <PaymentClient
        orderNumber={order.orderNumber}
        totalCents={order.totalCents}
        stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null}
      />
    </main>
  );
}
