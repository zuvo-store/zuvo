"use client";
import { useState } from "react";
import { cardCls, SectionTitle } from "@/components/ui";
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

      {error && <p className="text-sm text-red-600">{error}</p>}
      {note && <div className={cardCls + " p-5 text-center"}><p className="font-bold text-emerald-700">✓ {note}</p></div>}

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
