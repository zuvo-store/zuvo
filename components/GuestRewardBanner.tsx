"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "zuvo_guest_reward_nudge";

/**
 * Slim, dismissible welcome strip shown ONLY to guests (signed-out visitors).
 * The claimable reward popup (RewardPopup) is reserved for signed-in users
 * who are actually eligible — guests get this non-blocking nudge instead.
 */
export default function GuestRewardBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="border-b border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-center">
        <span aria-hidden="true" className="text-base leading-none">
          🎁
        </span>
        <p className="text-[13px] text-zinc-700">
          <span className="font-semibold text-zinc-900">New to ZUVO?</span> Create a free
          account and get a <span className="font-semibold text-orange-700">$20 demo welcome reward</span>.
        </p>
        <Link
          href="/auth/signup"
          className="shrink-0 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700"
        >
          Sign up free
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-600"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
