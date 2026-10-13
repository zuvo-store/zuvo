export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder } from "@/lib/checkout";
import { createStripePaymentIntent, isStripeConfigured } from "@/lib/payments";

/**
 * STRIPE (test mode) — creates a PaymentIntent for the caller's draft order
 * and returns its client_secret for Stripe.js confirmation.
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return Response.json(
      { ok: false, error: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY." },
      { status: 503 },
    );
  }
  const draft = await getOrCreateDraftOrder();
  try {
    const { clientSecret, paymentIntentId } = await createStripePaymentIntent(draft.id);
    return Response.json({ ok: true, clientSecret, paymentIntentId });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not start the Stripe payment." },
      { status: 400 },
    );
  }
}
