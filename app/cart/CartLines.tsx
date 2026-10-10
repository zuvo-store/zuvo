"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartLine } from "@/lib/cart";
import { formatUSD } from "@/lib/money";
import QuantitySelector from "@/components/QuantitySelector";
import Price from "@/components/Price";
import { btn } from "@/components/ui";

export default function CartLines({ initialLines }: { initialLines: CartLine[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(promise: Promise<Response>, id: string | null, isClear = false) {
    setError(null);
    if (isClear) setClearing(true);
    else setPendingId(id);
    try {
      const res = await promise;
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPendingId(null);
      setClearing(false);
      router.refresh();
    }
  }

  const setQty = (itemId: string, qty: number) => {
    if (qty < 1) return remove(itemId);
    void mutate(
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, qty }),
      }),
      itemId
    );
  };

  const remove = (itemId: string) =>
    void mutate(
      fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      }),
      itemId
    );

  const clear = () => {
    if (!window.confirm("Remove all items from your cart?")) return;
    void mutate(
      fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      }),
      null,
      true
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          {initialLines.reduce((s, l) => s + l.qty, 0)} item(s)
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={clearing}
          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {clearing ? "Clearing…" : "Clear cart"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="space-y-4">
        {initialLines.map((line) => {
          const busy = pendingId === line.id;
          return (
            <li
              key={line.id}
              className={`flex gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm ${
                busy ? "opacity-60" : ""
              }`}
            >
              <Link href={`/product/${line.slug}`} className="shrink-0">
                {line.image ? (
                  <img
                    src={line.image}
                    alt={line.name}
                    className="h-20 w-20 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg bg-zinc-100" aria-hidden />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${line.slug}`}
                  className="block truncate font-medium text-zinc-900 hover:text-orange-600"
                >
                  {line.name}
                </Link>
                {line.variantLabel && <p className="text-sm text-zinc-500">{line.variantLabel}</p>}
                <div className="mt-1">
                  <Price cents={line.unitPriceCents} originalCents={line.originalUnitPriceCents} />
                </div>
                {!line.active && (
                  <p className="mt-1 text-sm text-red-600">This product is no longer available.</p>
                )}
                {line.qty > line.stockAvailable && (
                  <p className="mt-1 text-sm text-amber-600">
                    Only {line.stockAvailable} left in stock.
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <QuantitySelector
                    value={line.qty}
                    max={Math.max(line.stockAvailable, 1)}
                    onChange={(qty) => setQty(line.id, qty)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(line.id)}
                    disabled={busy}
                    className="text-sm font-medium text-zinc-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-zinc-900">{formatUSD(line.lineTotalCents)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-6">
        <Link href="/checkout" className={`${btn} sm:hidden`}>
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
