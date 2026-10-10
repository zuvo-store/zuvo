"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUSD } from "@/lib/money";
import { inputCls, btn } from "@/components/ui";
import type { DemoScenario } from "@/lib/payments";

type Props = {
  orderNumber: string;
  totalCents: number;
  scenarioLabels: Record<DemoScenario, string>;
};

const SCENARIOS: { value: DemoScenario; hint: string }[] = [
  { value: "success", hint: "Order is confirmed and stock is reserved." },
  { value: "declined", hint: "Simulates a declined card. Your cart is kept." },
  { value: "pending", hint: "Simulates a payment awaiting provider confirmation." },
  { value: "cancelled", hint: "Simulates the shopper cancelling at the gateway." },
  { value: "error", hint: "Simulates a processor timeout. Nothing is charged." },
];

export default function PaymentClient({ orderNumber, totalCents, scenarioLabels }: Props) {
  const router = useRouter();
  const [scenario, setScenario] = useState<DemoScenario>("success");
  const [pending, setPending] = useState(false);
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        paymentStatus?: string;
        orderNumber?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Payment could not be processed.");
        return;
      }
      if (data.paymentStatus === "PENDING") {
        setIsPendingPayment(true);
        return;
      }
      router.push(`/checkout/result?order=${encodeURIComponent(data.orderNumber ?? orderNumber)}&s=${scenario}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmPending() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/confirm-pending", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not confirm the pending payment.");
        return;
      }
      router.push(`/checkout/result?order=${encodeURIComponent(orderNumber)}&s=pending`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (isPendingPayment) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        <h2 className="mb-2 text-lg font-semibold text-amber-900">Payment is pending</h2>
        <p className="mb-4 text-sm text-amber-800">
          The demo provider has not confirmed this payment yet. You can simulate the provider
          confirming it, or go back and try a different scenario.
        </p>
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={confirmPending} disabled={pending} className={btn}>
            {pending ? "Confirming…" : "Simulate provider confirmation"}
          </button>
          <button
            type="button"
            onClick={() => setIsPendingPayment(false)}
            disabled={pending}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-white disabled:opacity-50"
          >
            Choose another scenario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          DEMO ONLY — No real payment will be processed. Do not enter real card details.
        </p>
        <p className="mt-1 text-xs text-amber-800">
          There is no card input on this page. Pick a simulated outcome below to see how checkout
          behaves.
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

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <fieldset className="mb-6">
        <legend className="mb-3 text-lg font-semibold text-zinc-900">Choose a test outcome</legend>
        <div className="space-y-3" role="radiogroup" aria-label="Test payment outcome">
          {SCENARIOS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                scenario === opt.value
                  ? "border-orange-500 bg-orange-50 ring-1 ring-orange-500"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <input
                type="radio"
                name="demo-scenario"
                className={inputCls + " mt-0.5 h-4 w-4 accent-orange-600"}
                checked={scenario === opt.value}
                onChange={() => setScenario(opt.value)}
                disabled={pending}
              />
              <span>
                <span className="block font-medium text-zinc-900">{scenarioLabels[opt.value]}</span>
                <span className="block text-sm text-zinc-500">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" onClick={pay} disabled={pending} className={`${btn} w-full sm:w-auto`}>
        {pending ? "Processing…" : `Pay ${formatUSD(totalCents)} (demo)`}
      </button>
    </div>
  );
}
