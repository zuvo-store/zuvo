"use client";

import { useEffect, useState } from "react";

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function clamp(v: number) {
    let out = Math.floor(v);
    if (Number.isNaN(out)) out = min;
    if (out < min) out = min;
    if (max != null && out > max) out = max;
    return out;
  }

  function commit(raw: string) {
    setText(raw);
    onChange(clamp(Number(raw)));
  }

  const btnCls =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-300 bg-white text-lg font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={btnCls}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setText(String(value))}
        aria-label="Quantity"
        className="h-10 w-16 rounded-xl border border-zinc-300 bg-white text-center text-sm font-semibold text-zinc-900 focus:border-brand-600 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={max != null && value >= max}
        aria-label="Increase quantity"
        className={btnCls}
      >
        +
      </button>
    </div>
  );
}
