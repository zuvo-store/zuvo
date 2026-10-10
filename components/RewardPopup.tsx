"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "zuvo_reward_dismissed";

export default function RewardPopup({
  amountCents,
  reward,
}: {
  amountCents?: number;
  /** Contract-style prop shape, kept for callers that pass reward={{amountCents,status}}. */
  reward?: { amountCents: number; status?: string };
}) {
  const cents = amountCents ?? reward?.amountCents ?? 0;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  const amount = `$${(cents / 100).toFixed(2)}`;

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Welcome reward"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
    >
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-5 py-4 text-white">
        <div className="flex items-start justify-between">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-100">
            Welcome to ZUVO
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-4xl font-extrabold tracking-tight">{amount}</p>
        <p className="mt-1 text-xs font-semibold">DEMO — NO CASH VALUE</p>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-zinc-600">
          Simulated demo reward. No real monetary value. Claim it to see how ZUVO rewards work.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/rewards/claim"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
          >
            Claim Reward
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Skip for Now
          </button>
          <Link
            href="/rewards/terms"
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
