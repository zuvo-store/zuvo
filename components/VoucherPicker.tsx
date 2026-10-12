"use client";

import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/money";

type Voucher = {
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minOrderCents: number;
  endsAt: string | null;
  personal: boolean;
};

/**
 * Voucher picker for checkout — tap a voucher to fill the promo code input.
 */
export default function VoucherPicker({ onPick }: { onPick: (code: string) => void }) {
  const [vouchers, setVouchers] = useState<Voucher[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/vouchers/available")
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then((d) => setVouchers(d.ok ? d.vouchers : []))
      .catch(() => setVouchers([]));
  }, []);

  if (vouchers === null || vouchers.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-bold text-orange-600 underline underline-offset-2 hover:text-orange-700"
      >
        🎟️ {open ? "Hide my vouchers" : `Pick from my vouchers (${vouchers.length})`}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {vouchers.map((v) => (
            <button
              key={v.code}
              type="button"
              onClick={() => {
                onPick(v.code);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 px-3 py-2.5 text-left transition hover:border-orange-400 hover:bg-orange-100 active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="text-sm font-extrabold tracking-wider text-zinc-900">
                  {v.code}
                  {v.personal ? <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">JUST FOR YOU</span> : null}
                </p>
                <p className="text-xs text-zinc-600">
                  {v.discountType === "PERCENT" ? `${v.discountValue}% OFF` : `${formatUSD(v.discountValue)} off`}
                  {v.minOrderCents > 0 ? ` • min ${formatUSD(v.minOrderCents)}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white">Apply</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
