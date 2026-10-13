"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QuantitySelector from "@/components/QuantitySelector";
import AddToCartButton from "@/components/AddToCartButton";
import { formatUSD } from "@/lib/money";
import { buyNow } from "./actions";

export type BuyVariant = {
  id: string;
  name: string;
  value: string;
  priceDeltaCents: number;
  stock: number;
};

/**
 * Variant selector + quantity + add-to-cart / buy-now.
 * Assumes variants are a single option dimension (e.g. Color); if a product ever
 * has several dimensions, the first selected variant id is passed to the cart.
 */
export default function BuyPanel({
  productId,
  basePriceCents,
  productStock,
  variants,
}: {
  productId: string;
  basePriceCents: number;
  productStock: number;
  variants: BuyVariant[];
}) {
  const router = useRouter();
  const groups = useMemo(() => {
    const map = new Map<string, BuyVariant[]>();
    for (const v of variants) {
      const list = map.get(v.name);
      if (list) list.push(v);
      else map.set(v.name, [v]);
    }
    return [...map.entries()];
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(() => {
    // Professional default: pre-select the first in-stock option per group so
    // "Add to cart" always works on first tap (like major marketplaces do).
    const init: Record<string, string> = {};
    const map = new Map<string, BuyVariant[]>();
    for (const v of variants) {
      const list = map.get(v.name);
      if (list) list.push(v);
      else map.set(v.name, [v]);
    }
    for (const [name, options] of map) {
      const first = options.find((o) => o.stock > 0) ?? options[0];
      if (first) init[name] = first.id;
    }
    return init;
  });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedVariants = useMemo(
    () =>
      groups
        .map(([name]) => variants.find((v) => v.id === selected[name]))
        .filter((v): v is BuyVariant => Boolean(v)),
    [groups, variants, selected]
  );

  const allSelected = groups.every(([name]) => Boolean(selected[name]));
  const effectiveStock =
    selectedVariants.length > 0
      ? Math.min(...selectedVariants.map((v) => v.stock))
      : productStock;
  const unitPriceCents =
    basePriceCents + selectedVariants.reduce((sum, v) => sum + v.priceDeltaCents, 0);
  const cartVariantId =
    variants.length > 0 && selectedVariants.length > 0 ? selectedVariants[0].id : null;
  const valid =
    effectiveStock > 0 && (variants.length === 0 || allSelected);

  function onQtyChange(next: number) {
    const max = Math.max(1, Math.min(99, effectiveStock));
    setQty(Math.max(1, Math.min(max, next)));
  }

  async function onBuyNow() {
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await buyNow(productId, cartVariantId, qty);
      if (res.loginRequired) {
        router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      } else if (res.ok) {
        router.push("/checkout");
      } else {
        setError(res.error ?? "Could not add this item to your cart.");
      }
    } catch {
      setError("Could not add this item to your cart. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map(([name, options]) => (
        <div key={name}>
          <p className="text-sm font-medium text-zinc-700">
            {name}
            {selected[name] ? (
              <span className="ml-2 font-normal text-zinc-500">
                {options.find((o) => o.id === selected[name])?.value}
              </span>
            ) : (
              <span className="ml-2 font-normal text-orange-600">— select an option</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((o) => {
              const isActive = selected[name] === o.id;
              const out = o.stock < 1;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSelected((s) => ({ ...s, [name]: o.id }));
                    setQty(1);
                    setError(null);
                  }}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500"
                      : out
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 line-through"
                        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                >
                  {o.value}
                  {o.priceDeltaCents !== 0 && (
                    <span className="ml-1 text-xs text-zinc-500">
                      ({o.priceDeltaCents > 0 ? "+" : ""}
                      {formatUSD(o.priceDeltaCents)})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-zinc-700">Quantity</p>
          <QuantitySelector value={qty} onChange={onQtyChange} />
        </div>
        <div className="text-sm text-zinc-500">
          {effectiveStock > 10 && "In stock"}
          {effectiveStock > 0 && effectiveStock <= 10 && `Only ${effectiveStock} left`}
          {effectiveStock < 1 && "Out of stock"}
        </div>
      </div>

      <div className="text-2xl font-extrabold text-zinc-900">
        {formatUSD(unitPriceCents * qty)}
        {qty > 1 && (
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {formatUSD(unitPriceCents)} each
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className={valid ? "flex-1" : "flex-1 opacity-50 pointer-events-none"}>
          <AddToCartButton productId={productId} variantId={cartVariantId ?? undefined} qty={qty} />
        </div>
        <button
          type="button"
          onClick={onBuyNow}
          disabled={!valid || pending}
          className="flex-1 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Adding…" : "Buy Now"}
        </button>
      </div>
      {!valid && variants.length > 0 && !allSelected && (
        <p className="text-sm text-orange-600">Please choose an option above to continue.</p>
      )}
    </div>
  );
}
