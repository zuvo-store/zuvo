"use client";
import { useEffect, useState } from "react";
import { cardCls, SectionTitle } from "@/components/ui";
import { formatUSD } from "@/lib/money";

type Product = { id: string; name: string; priceCents: number; shortDesc: string | null };
type Platform = "instagram" | "facebook" | "whatsapp";

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: "instagram", label: "Instagram", icon: "📸" },
  { id: "facebook", label: "Facebook", icon: "📘" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
];

export default function MarketingPage() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [post, setPost] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/admin/marketing/products?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => { if (d?.ok) setProducts(d.products); })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  async function generate() {
    if (!selected) return;
    setBusy(true);
    setPost(null);
    setCopied(false);
    try {
      const res = await fetch("/api/admin/ai/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name, price: selected.priceCents / 100,
          platform, shortDesc: selected.shortDesc,
        }),
      });
      const d = await res.json();
      if (d?.ok) setPost(d.post);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  function copy() {
    if (!post) return;
    navigator.clipboard.writeText(post).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="✨ AI Marketing Posts" subtitle="Viral social captions for your products — one click." />

      <div className={cardCls + " p-5"}>
        <label className="text-sm font-bold text-zinc-800">1. Pick a product</label>
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400"
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {products.map((p) => (
            <button
              key={p.id} type="button"
              onClick={() => setSelected(p)}
              className={`rounded-xl border p-3 text-left transition ${selected?.id === p.id ? "border-orange-500 bg-orange-50 ring-1 ring-orange-300" : "border-zinc-200 hover:border-zinc-300"}`}
            >
              <p className="truncate text-sm font-bold text-zinc-900">{p.name}</p>
              <p className="text-xs text-zinc-500">{formatUSD(p.priceCents)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className={cardCls + " p-5"}>
        <label className="text-sm font-bold text-zinc-800">2. Choose platform</label>
        <div className="mt-2 flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id} type="button" onClick={() => setPlatform(p.id)}
              className={`rounded-full px-5 py-2 text-sm font-bold transition ${platform === p.id ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
        <button
          type="button" onClick={generate} disabled={!selected || busy}
          className="mt-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-2.5 text-sm font-bold text-white shadow disabled:opacity-50"
        >
          {busy ? "✨ Writing…" : "✨ Generate post"}
        </button>
      </div>

      {post && (
        <div className={cardCls + " p-5"}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-zinc-800">3. Your post</label>
            <button
              type="button" onClick={copy}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
            >
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
          <p className="mt-3 whitespace-pre-line rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-800">{post}</p>
        </div>
      )}
    </div>
  );
}
