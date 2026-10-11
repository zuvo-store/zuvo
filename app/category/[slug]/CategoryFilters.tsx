"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SORT_OPTIONS } from "@/app/_shop/query";
import { btn } from "@/components/ui";

export type CategoryFilterValues = {
  q: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

export default function CategoryFilters({
  slug,
  initial,
}: {
  slug: string;
  initial: CategoryFilterValues;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [sort, setSort] = useState(initial.sort);
  const [expanded, setExpanded] = useState(false);

  const hasActive = q.trim() || minPrice || maxPrice || sort;

  function apply(next: CategoryFilterValues) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.minPrice) params.set("minPrice", next.minPrice);
    if (next.maxPrice) params.set("maxPrice", next.maxPrice);
    if (next.sort) params.set("sort", next.sort);
    const s = params.toString();
    router.push(s ? `/category/${slug}?${s}` : `/category/${slug}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply({ q, minPrice, maxPrice, sort });
  }

  function onSortChange(value: string) {
    setSort(value);
    apply({ q, minPrice, maxPrice, sort: value });
  }

  function clear() {
    setQ("");
    setMinPrice("");
    setMaxPrice("");
    setSort("");
    router.push(`/category/${slug}`);
  }

  const inputSm =
    "rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      {/* Single-row premium filter bar — stacks gracefully on mobile */}
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            className={`${inputSm} w-full pl-10`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search in category…"
            aria-label="Search in category"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <select
              className={`${inputSm} w-full cursor-pointer appearance-none pr-8 font-medium sm:w-auto`}
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              expanded || hasActive
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M6 10h8M10 15h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="15" r="1.5" fill="currentColor" />
              <circle cx="14" cy="10" r="1.5" fill="currentColor" />
              <circle cx="7" cy="5" r="1.5" fill="currentColor" />
            </svg>
            Filters
            {hasActive ? <span className="h-2 w-2 rounded-full bg-orange-500" /> : null}
          </button>
        </div>
      </form>

      {/* Expandable price row */}
      {expanded && (
        <form onSubmit={onSubmit} className="mt-3 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            Min price ($)
            <input
              className={inputSm}
              inputMode="decimal"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-zinc-500">
            Max price ($)
            <input
              className={inputSm}
              inputMode="decimal"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
            />
          </label>
          <button type="submit" className={`${btn} shrink-0 !rounded-full`}>
            Apply
          </button>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Clear
          </button>
        </form>
      )}
    </div>
  );
}
