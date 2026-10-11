"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [countdown, setCountdown] = useState(8);

  // Auto-retry: deployment 500s are temporary — the new build lands in seconds.
  useEffect(() => {
    if (countdown <= 0) {
      retry();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, retry]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-100">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-[spin_3s_linear_infinite] text-orange-500">
          <path d="M14.7 6.3a4.5 4.5 0 00-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 006-6L14 13l-2.5-2.5 3.2-4.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-600">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
        Updating ZUVO
      </p>
      <h1 className="mt-4 text-3xl font-extrabold text-zinc-900">
        We&apos;re making ZUVO better
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        We&apos;re rolling out a fresh update right now. This only takes a moment —
        retrying automatically in {countdown}s.
        {error.digest ? (
          <span className="mt-1 block text-xs text-zinc-400">
            Error reference: {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
        >
          Retry now
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
