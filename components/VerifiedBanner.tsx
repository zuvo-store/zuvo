"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Shows a one-time success banner after email verification.
 * - ?verified=signup → "Welcome! Your account has been created."
 * - ?verified=login  → "Your email is verified. Welcome back!"
 * Auto-dismisses after 6s and cleans the query param from the URL.
 */
export default function VerifiedBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const [visible, setVisible] = useState(!!verified);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!verified) return;
    const t = setTimeout(() => dismiss(), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  if (!verified || !visible) return null;

  function dismiss() {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      // Remove ?verified=... from the URL without a full reload.
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      router.replace(url.pathname + url.search, { scroll: false });
    }, 300);
  }

  const isSignup = verified === "signup";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-auto w-full max-w-7xl px-4 pt-4 transition-all duration-300 sm:px-6 lg:px-8 ${
        leaving ? "-translate-y-2 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 10.5l4 4 8-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-green-900">
            {isSignup ? "Welcome to ZUVO! 🎉" : "Email verified!"}
          </p>
          <p className="mt-0.5 text-sm text-green-800">
            {isSignup
              ? "Your account has been created successfully. Start exploring deals made for you."
              : "Your email is verified. Welcome back!"}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1.5 text-green-700 transition hover:bg-green-100"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
