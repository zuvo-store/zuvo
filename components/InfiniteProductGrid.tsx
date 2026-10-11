"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import type { ProductListItem } from "@/app/_shop/query";

type Filters = {
  q?: string;
  categorySlug?: string;
  sort?: string;
  deal?: boolean;
  minCents?: number;
  maxCents?: number;
};

type Batch = {
  page: number;
  items: ProductListItem[];
};

/**
 * Temu-style infinite scroll product grid with page-feel dividers.
 * Loads more products automatically as the user scrolls, marking each
 * batch with a "Page N" divider so page transitions are visible.
 */
export default function InfiniteProductGrid({
  initialItems,
  initialPage,
  totalPages,
  total,
  filters,
  perPage = 24,
}: {
  initialItems: ProductListItem[];
  initialPage: number;
  totalPages: number;
  total: number;
  filters: Filters;
  perPage?: number;
}) {
  const [batches, setBatches] = useState<Batch[]>([
    { page: initialPage, items: initialItems },
  ]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const loadingRef = useRef(false);

  const shownCount = batches.reduce((s, b) => s + b.items.length, 0);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page + 1));
      params.set("perPage", String(perPage));
      if (filters.q) params.set("q", filters.q);
      if (filters.categorySlug) params.set("categorySlug", filters.categorySlug);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.deal) params.set("deal", "1");
      if (filters.minCents) params.set("minCents", String(filters.minCents));
      if (filters.maxCents) params.set("maxCents", String(filters.maxCents));
      const res = await fetch(`/api/products/list?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        const fresh = (data.items as ProductListItem[]).filter(
          (p) => !batches.some((b) => b.items.some((x) => x.id === p.id))
        );
        if (fresh.length > 0) {
          setBatches((prev) => [...prev, { page: data.page, items: fresh }]);
        }
        setPage(data.page);
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      /* keep hasMore true so user can retry */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, perPage, filters, batches]);

  // Reset when filters change (e.g. new search)
  useEffect(() => {
    setBatches([{ page: initialPage, items: initialItems }]);
    setPage(initialPage);
    setHasMore(initialPage < totalPages);
  }, [initialItems, initialPage, totalPages]);


  return (
    <div>
      {/* Product counter */}
      <p className="mt-4 text-sm text-zinc-500" role="status">
        Showing <span className="font-semibold text-zinc-900">{shownCount}</span> of{" "}
        <span className="font-semibold text-zinc-900">{total}</span> products
      </p>

      {batches.map((batch, bi) => (
        <div key={batch.page}>
          {/* Page divider — gives the "next page" feel */}
          {bi > 0 && (
            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-zinc-200" />
              <span className="rounded-full bg-zinc-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
                Page {batch.page}
              </span>
              <span className="h-px flex-1 bg-zinc-200" />
            </div>
          )}
          <div
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${
              bi === 0 ? "mt-4" : "animate-page-slide"
            }`}
          >
            {batch.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ))}

      {/* Load-more status */}
      <div className="mt-6 flex flex-col items-center gap-3 pb-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500" role="status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin text-orange-500">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Loading page {page + 1}…
          </div>
        )}
        {!loading && hasMore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-8 py-3 text-sm font-bold text-white shadow hover:bg-orange-600"
          >
            Show more
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 7l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {!hasMore && shownCount > 0 && (
          <p className="text-sm text-zinc-400">You&apos;ve seen it all 🎉</p>
        )}
      </div>
    </div>
  );
}
