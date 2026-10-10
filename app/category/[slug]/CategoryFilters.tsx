"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SORT_OPTIONS } from "@/app/_shop/query";
import { btn, inputCls } from "@/components/ui";

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

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Search in category</span>
          <input
            className={inputCls}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Keyword…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Min price ($)</span>
          <input
            className={inputCls}
            inputMode="decimal"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Max price ($)</span>
          <input
            className={inputCls}
            inputMode="decimal"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Any"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Sort by</span>
          <select
            className={inputCls}
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className={btn}>
          Apply
        </button>
        <button
          type="button"
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          onClick={() => {
            setQ("");
            setMinPrice("");
            setMaxPrice("");
            setSort("");
            router.push(`/category/${slug}`);
          }}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
