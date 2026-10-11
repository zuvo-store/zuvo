"use client";

import { useEffect, useState } from "react";

/**
 * Flash-sale countdown to midnight (local time). Temu-style urgency timer.
 */
export default function FlashSaleCountdown() {
  const [left, setLeft] = useState("--:--:--");

  useEffect(() => {
    function tick() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const ms = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setLeft(`${pad(h)}:${pad(m)}:${pad(s)}`);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const [h, m, s] = left.split(":");

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 px-5 py-4 text-white shadow-sm">
      <span className="flex items-center gap-2 text-lg font-extrabold">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        Flash Sale ends in
      </span>
      <span className="flex items-center gap-1.5" role="timer" aria-label={`Sale ends in ${left}`}>
        {[h, m, s].map((unit, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="rounded-lg bg-black/25 px-2.5 py-1 font-mono text-lg font-extrabold tabular-nums">
              {unit}
            </span>
            {i < 2 && <span className="font-extrabold">:</span>}
          </span>
        ))}
      </span>
      <span className="ml-auto hidden text-sm font-medium text-white/90 sm:block">
        New deals drop daily at midnight
      </span>
    </div>
  );
}
