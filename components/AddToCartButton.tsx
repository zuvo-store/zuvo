"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddToCartButton({
  productId,
  variantId,
  qty = 1,
  label = "Add to cart",
  className = "",
}: {
  productId: string;
  variantId?: string | null;
  qty?: number;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: variantId ?? null, qty }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not add to cart. Please try again.");
        return;
      }
      setAdded(true);
      router.refresh();
      setTimeout(() => setAdded(false), 2000);
    } catch {
      setError("Could not add to cart. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-stretch">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-live="polite"
        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow disabled:cursor-not-allowed disabled:opacity-60 ${
          added ? "bg-green-600 text-white" : "bg-brand-600 text-white hover:bg-brand-700"
        } ${className}`}
      >
        {pending ? "Adding…" : added ? "Added" : label}
      </button>
      {error ? (
        <span role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
