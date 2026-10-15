"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";
import { formatUSD } from "@/lib/money";
import { btn } from "@/components/ui";
import ConfirmDialog from "@/components/ConfirmDialog";

type Props = {
  orderNumber: string;
  totalCents: number;
  stripePublishableKey: string | null;
};

export default function PaymentClient({ orderNumber, totalCents, stripePublishableKey }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<"cod" | "stripe">("stripe");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codConfirm, setCodConfirm] = useState(false);

  async function placeCodOrder() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/cod", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        orderNumber?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Order could not be placed.");
        return;
      }
      router.push(`/checkout/result?order=${encodeURIComponent(data.orderNumber ?? orderNumber)}&s=cod`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {/* Payment method selector */}
      <fieldset className="mb-6">
        <legend className="mb-3 text-lg font-semibold text-zinc-900">Payment method</legend>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              method === "cod"
                ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
              disabled={pending}
            />
            <span>
              <span className="block font-medium text-zinc-900">💵 Cash on Delivery</span>
              <span className="block text-sm text-zinc-500">Pay in cash when your order arrives.</span>
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              method === "stripe"
                ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
              checked={method === "stripe"}
              onChange={() => setMethod("stripe")}
              disabled={pending}
            />
            <span>
              <span className="block font-medium text-zinc-900">💳 Card (Stripe)</span>
              <span className="block text-sm text-zinc-500">Pay securely by card. Test mode.</span>
            </span>
          </label>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {method === "cod" ? (
        <div className="rounded-xl border border-green-300 bg-green-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-green-900">💵 Cash on Delivery</h2>
          <p className="mb-1 text-sm text-green-800">
            Your order will be confirmed right away and shipped to you.
          </p>
          <p className="mb-4 text-sm font-semibold text-green-900">
            Pay {formatUSD(totalCents)} in cash when your order arrives.
          </p>
          <button type="button" onClick={() => setCodConfirm(true)} disabled={pending} className={`${btn} w-full sm:w-auto`}>
            {pending ? "Placing order…" : `Place order — pay ${formatUSD(totalCents)} on delivery`}
          </button>
          <ConfirmDialog
            open={codConfirm}
            title="Confirm your order"
            message={`Place this order with Cash on Delivery? You'll pay ${formatUSD(totalCents)} in cash when your order arrives.`}
            confirmLabel="Yes, place order"
            loading={pending}
            onConfirm={() => { setCodConfirm(false); placeCodOrder(); }}
            onCancel={() => setCodConfirm(false)}
          />
        </div>
      ) : (
        stripePublishableKey ? (
          <StripePaySection
            totalCents={totalCents}
            orderNumber={orderNumber}
            publishableKey={stripePublishableKey}
          />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-zinc-900">💳 Card (Stripe)</h2>
            <p className="text-sm text-zinc-600">
              Stripe is not configured yet. Ask the store owner to add{" "}
              <code className="rounded bg-zinc-200 px-1 font-mono text-xs">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-zinc-200 px-1 font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
              to enable card payments.
            </p>
          </div>
        )
      )}
    </div>
  );
}

/**
 * Stripe card payment (test mode). Mounts a Stripe CardElement, creates a
 * PaymentIntent on the server, confirms it with Stripe.js, then asks the
 * server to verify and confirm the order.
 */
function StripePaySection({
  totalCents,
  orderNumber,
  publishableKey,
}: {
  totalCents: number;
  orderNumber: string;
  publishableKey: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardElRef = useRef<StripeCardElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stripe = await loadStripe(publishableKey);
        if (cancelled || !stripe || !cardRef.current) return;
        stripeRef.current = stripe;
        const elements = stripe.elements();
        const card = elements.create("card", {
          style: {
            base: { fontSize: "16px", color: "#18181b", "::placeholder": { color: "#a1a1aa" } },
            invalid: { color: "#b91c1c" },
          },
        });
        card.mount(cardRef.current);
        cardElRef.current = card;
        card.on("change", (e) => {
          setCardReady(e.complete);
          setError(e.error ? e.error.message : null);
        });
      } catch {
        if (!cancelled) setError("Could not load the card form. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
      cardElRef.current?.destroy();
      cardElRef.current = null;
    };
  }, [publishableKey]);

  async function payWithStripe() {
    setError(null);
    setPending(true);
    try {
      // 1. Create the PaymentIntent on the server.
      const res = await fetch("/api/payments/stripe", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        clientSecret?: string;
      };
      if (!res.ok || !data.ok || !data.clientSecret) {
        setError(data.error ?? "Could not start the Stripe payment.");
        return;
      }
      // 2. Confirm the card payment with Stripe.js.
      const stripe = stripeRef.current;
      const card = cardElRef.current;
      if (!stripe || !card) {
        setError("The card form is not ready yet. Please wait a moment.");
        return;
      }
      const result = await stripe.confirmCardPayment(data.clientSecret, { payment_method: { card } });
      if (result.error) {
        setError(result.error.message ?? "Card payment failed. Please try another card.");
        return;
      }
      if (result.paymentIntent?.status !== "succeeded") {
        setError(`Payment status: ${result.paymentIntent?.status ?? "unknown"}. Please try again.`);
        return;
      }
      // 3. Verify server-side and confirm the order.
      const cRes = await fetch("/api/payments/stripe/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: result.paymentIntent.id }),
      });
      const cData = (await cRes.json().catch(() => ({}))) as { ok?: boolean; error?: string; orderNumber?: string };
      if (!cRes.ok || !cData.ok) {
        setError(cData.error ?? "Payment succeeded but the order could not be confirmed. Contact support.");
        return;
      }
      router.push(`/checkout/result?order=${encodeURIComponent(cData.orderNumber ?? orderNumber)}&s=stripe`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-900">💳 Stripe test mode — no real charge.</p>
        <p className="mt-1 text-xs text-indigo-800">
          Use test card <code className="font-mono font-semibold">4242 4242 4242 4242</code>, any future expiry,
          any CVC.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600">Order</span>
          <span className="font-mono font-medium text-zinc-900">{orderNumber}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-zinc-600">Amount</span>
          <span className="font-bold text-zinc-900">{formatUSD(totalCents)}</span>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-zinc-700">Card details</label>
        <div ref={cardRef} className="rounded-lg border border-zinc-200 px-3 py-3" />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={payWithStripe}
        disabled={pending || !cardReady}
        className={`${btn} w-full sm:w-auto`}
      >
        {pending ? "Processing…" : `Pay ${formatUSD(totalCents)}`}
      </button>
    </div>
  );
}
