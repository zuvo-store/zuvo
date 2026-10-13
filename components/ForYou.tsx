"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import { formatUSD } from "@/lib/money";

type RecItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  originalPriceCents?: number | null;
  images: string[];
  rating?: number | null;
};

/** Personalized "For You" picks, powered by AI. Hides until there is taste data. */
export default function ForYou() {
  const [items, setItems] = useState<RecItem[] | null>(null);

  useEffect(() => {
    let slugs: string[] = [];
    try {
      const raw = localStorage.getItem("zuvo-recently-viewed");
      const list = raw ? JSON.parse(raw) : [];
      slugs = list.map((x: { slug: string }) => x.slug).filter(Boolean).slice(0, 8);
    } catch {
      /* ignore */
    }
    if (slugs.length === 0) return;
    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.items) && d.items.length > 0 && d.personalized) {
          setItems(d.items);
        }
      })
      .catch(() => {});
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-12">
      <SectionTitle title="✨ For You" subtitle="AI picks based on what you've been browsing" />
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {items.map((p) => {
          const img = Array.isArray(p.images) ? p.images[0] : null;
          return (
            <Link
              key={p.id}
              href={`/product/${p.slug}`}
              className="w-40 shrink-0 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-square overflow-hidden bg-zinc-100">
                {img ? (
                  <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-300">
                    {p.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                <p className="mt-1 text-sm font-bold text-zinc-900">
                  {formatUSD(p.priceCents)}{" "}
                  {p.originalPriceCents && p.originalPriceCents > p.priceCents && (
                    <span className="font-normal text-zinc-400 line-through">
                      {formatUSD(p.originalPriceCents)}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
