"use client";
import { useState } from "react";
import { cardCls } from "@/components/ui";

/** Render the AI briefing markdown-ish text with section styling. */
function BriefingBody({ text }: { text: string }) {
  const blocks = text.split(/\n(?=\d\. |#{1,3} )/);
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        const lines = b.trim().split("\n");
        const head = lines[0].replace(/^#{1,3}\s*/, "").trim();
        const body = lines.slice(1).join("\n").trim();
        const isHeading = /^\d\.\s/.test(lines[0]) || lines[0].startsWith("#");
        return (
          <div key={i}>
            {isHeading ? (
              <h4 className="text-sm font-extrabold text-zinc-900">{head}</h4>
            ) : (
              <p className="text-sm font-semibold text-zinc-700">{head}</p>
            )}
            {body && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-600">{body}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** ✨ AI Business Briefing — where the business stands right now + Q&A. */
export default function AIBriefing() {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [qa, setQa] = useState<{ q: string; a: string }[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/insights", { method: "POST" });
      const d = await res.json();
      if (d?.ok && d.briefing) setBriefing(d.briefing);
      else setError(d?.error ?? "AI unavailable right now.");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question || asking) return;
    setAsking(true);
    try {
      const res = await fetch("/api/admin/ai/insights/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await res.json();
      if (d?.ok && d.answer) {
        setQa((prev) => [{ q: question, a: d.answer }, ...prev].slice(0, 10));
        setQ("");
      }
    } catch {
      /* ignore */
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className={cardCls + " overflow-hidden p-0"}>
      <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-white">✨ AI Business Briefing</h3>
            <p className="text-xs text-white/80">Where your online business stands right now — full picture, in order.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-violet-700 shadow hover:bg-violet-50 disabled:opacity-60"
          >
            {loading ? "✨ Analyzing…" : briefing ? "↻ Refresh briefing" : "✨ Generate briefing"}
          </button>
        </div>
      </div>

      <div className="p-5">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!briefing && !loading && !error && (
          <p className="text-sm text-zinc-500">
            One click — AI reads your revenue, orders, products, customers and inventory, then tells you exactly
            where the business stands and what to do next.
          </p>
        )}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-zinc-100" style={{ width: `${90 - i * 15}%` }} />
            ))}
          </div>
        )}
        {briefing && <BriefingBody text={briefing} />}

        {briefing && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <form onSubmit={ask} className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask anything — e.g. which products should I discount?"
                className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm outline-none focus:border-violet-400"
                maxLength={300}
              />
              <button
                type="submit"
                disabled={asking || !q.trim()}
                className="shrink-0 rounded-full bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {asking ? "…" : "Ask"}
              </button>
            </form>
            {qa.length > 0 && (
              <div className="mt-4 space-y-3">
                {qa.map((item, i) => (
                  <div key={i} className="rounded-xl bg-zinc-50 p-3">
                    <p className="text-sm font-bold text-zinc-800">❓ {item.q}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-zinc-600">💡 {item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
