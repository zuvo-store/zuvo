export const dynamic = "force-dynamic";

import Stripe from "stripe";
import { confirmStripePayment } from "@/lib/payments";

/**
 * STRIPE webhook (test mode). Handles async payment completion, e.g. when the
 * shopper's bank requires extra authentication after the client-side step.
 *
 * Signature verification is enforced when STRIPE_WEBHOOK_SECRET is set;
 * otherwise the JSON body is trusted with a warning (test-mode convenience).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ ok: false, error: "Stripe not configured." }, { status: 503 });

  const stripe = new Stripe(secret);
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (e) {
      console.error("[zuvo] stripe webhook signature invalid:", e instanceof Error ? e.message : e);
      return Response.json({ ok: false, error: "Invalid signature." }, { status: 400 });
    }
  } else {
    console.warn("[zuvo] STRIPE_WEBHOOK_SECRET not set — trusting webhook body without signature verification (test mode only).");
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = typeof pi.metadata?.orderId === "string" ? pi.metadata.orderId : "";
      if (!orderId) {
        console.error("[zuvo] stripe webhook: payment_intent.succeeded without orderId metadata.");
      } else {
        const { orderNumber } = await confirmStripePayment(orderId, pi.id);
        console.log(`[zuvo] stripe webhook confirmed order ${orderNumber} (${pi.id}).`);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`[zuvo] stripe webhook: payment failed for intent ${pi.id}.`);
    }
  } catch (e) {
    console.error("[zuvo] stripe webhook handler failed:", e instanceof Error ? e.message : e);
    // Return 200 anyway for idempotent re-deliveries of already-confirmed orders;
    // real mismatches are logged above.
    return Response.json({ ok: true, warning: "handler failed; see logs" });
  }
  return Response.json({ ok: true });
}
