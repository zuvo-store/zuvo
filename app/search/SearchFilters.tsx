"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SORT_OPTIONS } from "@/app/_shop/query";
import { btn, inputCls } from "@/components/ui";

export type FilterValues = {
  q: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

export default function SearchFilters({
  initial,
  categories,
}: {
  initial: FilterValues;
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [sort, setSort] = useState(initial.sort);

  function apply(next: FilterValues) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.category) params.set("category", next.category);
    if (next.minPrice) params.set("minPrice", next.minPrice);
    if (next.maxPrice) params.set("maxPrice", next.maxPrice);
    if (next.sort) params.set("sort", next.sort);
    router.push(`/search?${params.toString()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply({ q, category, minPrice, maxPrice, sort });
  }

  function onSortChange(value: string) {
    setSort(value);
    apply({ q, category, minPrice, maxPrice, sort: value });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Search</span>
          <input
            className={inputCls}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Product, brand, keyword…"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Category</span>
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
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
          Apply filters
        </button>
        <button
          type="button"
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          onClick={() => {
            setQ("");
            setCategory("");
            setMinPrice("");
            setMaxPrice("");
            setSort("");
            router.push("/search");
          }}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
