"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "zuvo_reward_seen_v2";

/**
 * Voucher-style welcome reward popup. Shows exactly ONCE per browser —
 * marked as seen the moment it appears, so it never nags on repeat visits.
 */
export default function RewardPopup({
  amountCents,
  reward,
}: {
  amountCents?: number;
  reward?: { amountCents: number; status?: string };
}) {
  const cents = amountCents ?? reward?.amountCents ?? 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(STORAGE_KEY);
    } catch {
      seen = true;
    }
    if (seen) return;
    const t = setTimeout(() => {
      setVisible(true);
      // Mark as seen immediately — shows exactly once, even without dismissal.
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const amount = `$${(cents / 100).toFixed(2)}`;

  return (
    <div
      role="dialog"
      aria-label="Welcome reward voucher"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto w-[calc(100vw-2rem)] max-w-xs sm:left-auto sm:right-6"
    >
      <div className="overflow-hidden rounded-2xl shadow-2xl">
        {/* Voucher body */}
        <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 px-5 pb-5 pt-4 text-white">
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Close"
            className="absolute right-3 top-3 rounded-full p-1 text-white/80 hover:bg-white/15 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-100">
            ZUVO Welcome voucher
          </p>
          <p className="mt-1.5 text-4xl font-extrabold tracking-tight">{amount}</p>
          <p className="mt-0.5 text-xs font-medium text-orange-100">
            Demo credit · no cash value
          </p>
          {/* Perforated edge */}
          <div className="absolute -bottom-2 left-0 right-0 flex justify-between px-2" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} className="h-4 w-4 rounded-full bg-white" style={{ marginTop: 8 }} />
            ))}
          </div>
        </div>
        {/* Voucher stub */}
        <div className="border-t-2 border-dashed border-orange-200 bg-white px-5 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              One claim per account.
              <br />
              <span className="font-semibold text-zinc-700">Claim it now 👇</span>
            </p>
            <Link
              href="/rewards/claim"
              className="shrink-0 rounded-full bg-orange-500 px-5 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
            >
              Claim
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
