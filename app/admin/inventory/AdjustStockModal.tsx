"use client";

import { useState } from "react";

const TYPES = [
  { id: "PURCHASE", label: "📥 Purchase (stock in)", hint: "New stock arrived" },
  { id: "DAMAGE", label: "🔴 Damage (stock out)", hint: "Items damaged" },
  { id: "MISSING", label: "🟡 Missing (stock out)", hint: "Items lost/missing" },
  { id: "RETURN", label: "🟢 Return (stock in)", hint: "Customer return" },
  { id: "ADJUSTMENT", label: "✏️ Set exact qty", hint: "Correct the count" },
];

/** Adjust-stock modal: pick a movement type, qty, and reason. */
export default function AdjustStockModal({
  productId,
  productName,
  currentStock,
}: {
  productId: string;
  productName: string;
  currentStock: number;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("PURCHASE");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const q = parseInt(qty, 10);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Enter a valid quantity.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, type, qty: q, reason }),
      });
      const d = await res.json();
      if (!d?.ok) {
        setError(d?.error ?? "Failed to adjust stock.");
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  const selected = TYPES.find((t) => t.id === type);

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQty(""); setReason(""); setError(null); setType("PURCHASE"); }}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-zinc-700"
      >
        Adjust
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => { if (!busy) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label={`Adjust stock for ${productName}`}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-zinc-900">Adjust stock</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold text-zinc-500 hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 truncate text-sm text-zinc-500">
              {productName} · current: <span className="font-extrabold text-zinc-800">{currentStock}</span>
            </p>

            <label className="mb-1 block text-sm font-bold text-zinc-800">Movement type</label>
            <div className="mb-4 grid grid-cols-1 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 text-left text-sm transition ${
                    type === t.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <span className="font-bold text-zinc-900">{t.label}</span>
                  <span className="text-xs text-zinc-500">{t.hint}</span>
                </button>
              ))}
            </div>

            <label className="mb-1 block text-sm font-bold text-zinc-800">
              Quantity {type === "ADJUSTMENT" ? "(set to)" : ""}
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={type === "ADJUSTMENT" ? "Exact stock count" : "How many units"}
              className="mb-4 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />

            <label className="mb-1 block text-sm font-bold text-zinc-800">
              Reason <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder={`e.g. ${selected?.hint.toLowerCase()}`}
              className="mb-4 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />

            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save adjustment"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
