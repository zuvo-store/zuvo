"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { formatUSD } from "@/lib/money";

type Item = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  originalPriceCents?: number | null;
  images: string[];
};

/** Camera/upload button: photo in, visually similar products out. */
export default function VisualSearchButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    setItems(null);
    setDescription(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/search/visual", { method: "POST", body: form });
      const d = await res.json();
      if (d?.ok) {
        setDescription(d.description ?? null);
        setItems(Array.isArray(d.items) ? d.items : []);
      } else {
        setError(d?.error ?? "Could not search by photo.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "📷 Analyzing…" : "📷 Search by photo"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {description && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm text-zinc-700">
            <span className="font-bold">AI sees:</span> {description}
          </p>
          {items && items.length === 0 && (
            <p className="mt-2 text-sm text-zinc-500">No similar products found in our store.</p>
          )}
          {items && items.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => {
                const img = Array.isArray(p.images) ? p.images[0] : null;
                return (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="aspect-square bg-zinc-100">
                      {img ? (
                        <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-300">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                      <p className="mt-0.5 text-sm font-bold text-zinc-900">{formatUSD(p.priceCents)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
