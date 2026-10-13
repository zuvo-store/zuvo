"use client";

import { useState } from "react";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this order? Your stock will be released.")) {
      return;
    }
    setLoading(true);
    try {
      const reason = window.prompt("Reason for cancellation (optional):") ?? "";
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error ?? "Could not cancel the order.");
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      alert("Could not cancel the order. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="rounded-xl border-2 border-red-500 px-5 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Cancelling…" : "Cancel Order"}
    </button>
  );
}
