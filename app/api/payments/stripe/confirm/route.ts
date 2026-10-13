export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder } from "@/lib/checkout";
import { confirmStripePayment, isStripeConfigured } from "@/lib/payments";

/**
 * STRIPE (test mode) — called after Stripe.js reports a successful card
 * confirmation. Verifies the PaymentIntent with Stripe, then confirms the
 * order through the shared confirmation core (idempotent).
 */
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return Response.json({ ok: false, error: "Stripe is not configured yet." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { paymentIntentId?: unknown } | null;
  const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId : "";
  if (!paymentIntentId) {
    return Response.json({ ok: false, error: "paymentIntentId is required." }, { status: 400 });
  }
  const draft = await getOrCreateDraftOrder();
  try {
    const { orderNumber } = await confirmStripePayment(draft.id, paymentIntentId);
    return Response.json({ ok: true, orderNumber });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Stripe payment could not be confirmed." },
      { status: 400 },
    );
  }
}
