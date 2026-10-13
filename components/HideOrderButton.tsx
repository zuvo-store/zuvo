"use client";

import { useState } from "react";

/** ✕ button to dismiss a cancelled/refunded order from the customer's list. */
export default function HideOrderButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);

  async function hide(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Remove this order from your list?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/hide`, { method: "POST" });
      const d = await res.json();
      if (d?.ok) {
        // Remove the card from the DOM instantly
        document.getElementById(`order-card-${orderId}`)?.remove();
      } else {
        alert(d?.error ?? "Could not remove the order.");
        setBusy(false);
      }
    } catch {
      alert("Could not remove the order.");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={hide}
      disabled={busy}
      aria-label="Remove from list"
      title="Remove from list"
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-500 shadow-sm transition hover:bg-zinc-200 hover:text-zinc-800 disabled:opacity-50"
    >
      {busy ? "…" : "✕"}
    </button>
  );
}
