"use client";
import { useState } from "react";
import { cardCls, SectionTitle, FormError } from "@/components/ui";
import { formatUSD } from "@/lib/money";

type Suggestion = {
  id: string; name: string; category: string;
  price: number; cost: number; marginPct: number; stock: number; sold30d: number;
  suggestedPrice: number; reason: string;
};

export default function SmartPricingPage() {
  const [sugs, setSugs] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  async function analyze() {
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/ai/pricing");
      const d = await res.json();
      if (d?.ok) {
        setSugs(d.suggestions);
        if (d.note) setNote(d.note);
      } else setError(d?.error ?? "AI unavailable");
    } catch { setError("Something went wrong."); } finally { setLoading(false); }
  }

  async function apply(s: Suggestion) {
    try {
      const res = await fetch("/api/admin/pricing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: s.id, price: s.suggestedPrice }),
      });
      const d = await res.json();
      if (d?.ok) setApplied((prev) => new Set(prev).add(s.id));
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Smart Pricing" subtitle="AI analyzes margins, stock & sales to suggest better prices." />
        <button
          type="button" onClick={analyze} disabled={loading}
          className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2.5 text-sm font-bold text-white shadow disabled:opacity-50"
        >
          {loading ? "✨ Analyzing…" : "✨ Analyze prices"}
        </button>
      </div>

      <FormError message={error} />
      {note && <div className={cardCls + " p-5 text-center"}><p className="font-bold text-emerald-700">✓ {note}</p></div>}

      {/* Empty state — before first analysis */}
      {!loading && !sugs && !note && (
        <div className={cardCls + " relative overflow-hidden p-8 text-center sm:p-12"}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-100 blur-2xl"
          />
          <p className="text-5xl">💰</p>
          <h2 className="mt-3 text-xl font-extrabold text-zinc-900">Let AI price your products</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            AI looks at your margins, stock levels, ratings and last 30 days of sales —
            then suggests a better price for each product with a clear reason.
          </p>
          <div className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-2 text-xs font-semibold text-zinc-600">
            <span className="rounded-full bg-zinc-100 px-3 py-1.5">📊 Margin analysis</span>
            <span className="rounded-full bg-zinc-100 px-3 py-1.5">📦 Stock-aware</span>
            <span className="rounded-full bg-zinc-100 px-3 py-1.5">⭐ Rating-aware</span>
          </div>
          <button
            type="button" onClick={analyze}
            className="mt-6 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 active:scale-95"
          >
            ✨ Analyze prices now
          </button>
          <p className="mt-3 text-xs text-zinc-400">Nothing changes until you press Apply on a suggestion.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className={cardCls + " overflow-hidden p-0"}>
          <div className="space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-100" />
              </div>
            ))}
          </div>
          <p className="border-t border-zinc-100 px-4 py-3 text-center text-sm font-medium text-zinc-500">
            ✨ AI is analyzing your catalog…
          </p>
        </div>
      )}

      {sugs && sugs.length > 0 && (
        <div className={cardCls + " overflow-hidden p-0"}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase text-zinc-400">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Now</th>
                  <th className="px-4 py-3">Suggested</th>
                  <th className="px-4 py-3">Why</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sugs.map((s) => {
                  const diff = s.suggestedPrice - s.price;
                  const done = applied.has(s.id);
                  return (
                    <tr key={s.id} className="border-b border-zinc-50 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-zinc-900">{s.name}</p>
                        <p className="text-xs text-zinc-400">{s.category} · margin {s.marginPct}% · stock {s.stock} · sold {s.sold30d}/30d</p>
                      </td>
                      <td className="px-4 py-3 font-bold">{formatUSD(Math.round(s.price * 100))}</td>
                      <td className="px-4 py-3">
                        <span className={`font-extrabold ${diff > 0 ? "text-emerald-600" : "text-orange-600"}`}>
                          {formatUSD(Math.round(s.suggestedPrice * 100))}
                        </span>
                        <span className="ml-1 text-xs text-zinc-400">({diff > 0 ? "+" : ""}{formatUSD(Math.round(diff * 100))})</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{s.reason}</td>
                      <td className="px-4 py-3">
                        {done ? (
                          <span className="text-xs font-bold text-emerald-600">✓ Applied</span>
                        ) : (
                          <button
                            type="button" onClick={() => apply(s)}
                            className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
                          >
                            Apply
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
