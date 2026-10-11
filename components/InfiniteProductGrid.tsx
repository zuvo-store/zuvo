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

/**
 * Temu-style infinite scroll product grid. Loads more products automatically
 * as the user scrolls (IntersectionObserver), with a "Load more" fallback.
 */
export default function InfiniteProductGrid({
  initialItems,
  initialPage,
  totalPages,
  filters,
  perPage = 24,
}: {
  initialItems: ProductListItem[];
  initialPage: number;
  totalPages: number;
  filters: Filters;
  perPage?: number;
}) {
  const [items, setItems] = useState<ProductListItem[]>(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPage < totalPages);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

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
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const fresh = (data.items as ProductListItem[]).filter((p) => !seen.has(p.id));
          return [...prev, ...fresh];
        });
        setPage(data.page);
        setHasMore(Boolean(data.hasMore));
      }
    } catch {
      /* keep hasMore true so user can retry */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page, perPage, filters]);

  // Reset when filters change (e.g. new search)
  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setHasMore(initialPage < totalPages);
  }, [initialItems, initialPage, totalPages]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* Sentinel + status */}
      <div ref={sentinelRef} aria-hidden="true" className="h-1" />

      <div className="mt-6 flex flex-col items-center gap-3 pb-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500" role="status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin text-orange-500">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Loading more…
          </div>
        )}
        {!loading && hasMore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-full border border-zinc-300 bg-white px-8 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
          >
            Load more
          </button>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-sm text-zinc-400">You&apos;ve seen it all 🎉</p>
        )}
      </div>
    </div>
  );
}
