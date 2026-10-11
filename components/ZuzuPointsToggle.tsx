"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUSD } from "@/lib/money";

/**
 * Toggle to redeem ZUZU points at checkout. 1000 pts = $1.
 */
export default function ZuzuPointsToggle({
  orderId,
  balance,
  redeemed,
  discountCents,
}: {
  orderId: string;
  balance: number;
  redeemed: number;
  discountCents: number;
}) {
  const router = useRouter();
  const [on, setOn] = useState(redeemed > 0);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/zuzu/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, usePoints: !on }),
      });
      const data = await res.json();
      if (data.ok) {
        setOn(!on);
        router.refresh();
      }
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  if (balance < 1000 && redeemed === 0) return null;

  const discountUsd = formatUSD(discountCents);

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900">⭐ Use ZUZU points</p>
          <p className="text-xs text-zinc-500">
            You have <span className="font-bold text-amber-700">{balance.toLocaleString()}</span> pts
            (1000 pts = $1)
          </p>
          {on && discountCents > 0 && (
            <p className="mt-1 text-xs font-bold text-green-700">
              −{discountUsd} applied! 🎉
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            on ? "bg-orange-500" : "bg-zinc-300"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              on ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
