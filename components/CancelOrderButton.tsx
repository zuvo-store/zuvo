"use client";

import { useState } from "react";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function confirmCancel() {
    const r = reason.trim();
    if (!r) {
      setError("Please tell us why — a reason is required to cancel.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not cancel the order.");
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Could not cancel the order. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setReason(""); setError(null); }}
        className="rounded-xl border-2 border-red-500 px-5 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
      >
        Cancel Order
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => { if (!loading) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Cancel order"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-zinc-900">Cancel this order?</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Your stock will be released. Please tell us the reason — it helps us improve.
            </p>
            <label className="mt-4 block text-sm font-bold text-zinc-800">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Ordered by mistake, found it cheaper elsewhere…"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            {error && (
              <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Keep my order
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Cancelling…" : "Yes, cancel it"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
