"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle } from "@/components/ui";

const KEY = "zuvo_recently_viewed";
const MAX = 8;

export type RecentProduct = {
  slug: string;
  name: string;
  image: string | null;
  priceCents: number;
};

/** Record a product view. Call from product pages. */
export function recordProductView(p: RecentProduct) {
  try {
    const raw = localStorage.getItem(KEY);
    const list: RecentProduct[] = raw ? JSON.parse(raw) : [];
    const next = [p, ...list.filter((x) => x.slug !== p.slug)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** "Recently viewed" carousel for the homepage. */
export function RecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <SectionTitle title="Recently viewed" subtitle="Pick up where you left off" />
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            className="w-36 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="aspect-square overflow-hidden bg-zinc-100">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-300">
                  {p.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
              <p className="mt-1 text-sm font-bold text-zinc-900">
                ${(p.priceCents / 100).toFixed(2)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
