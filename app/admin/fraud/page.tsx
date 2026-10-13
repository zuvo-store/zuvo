"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cardCls, SectionTitle } from "@/components/ui";
import { formatUSD } from "@/lib/money";

type Flag = { signal: string; detail: string };
type Order = {
  id: string; orderNumber: string; totalCents: number; status: string;
  customer: string; email: string; score: number; level: string; flags: Flag[];
};

function levelCls(level: string) {
  return level === "HIGH"
    ? "bg-red-100 text-red-700"
    : level === "MEDIUM"
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
}

function FraudCard({ order }: { order: Order }) {
  const [assessment, setAssessment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function explain() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai/fraud-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const d = await res.json();
      if (d?.ok) setAssessment(d.assessment);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  return (
    <div className={cardCls + " p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/admin/orders/${order.id}`} className="font-bold text-orange-700 hover:underline">
            {order.orderNumber}
          </Link>
          <p className="text-sm text-zinc-500">{order.customer} · {order.email}</p>
          <p className="mt-1 text-xs text-zinc-400">{order.status} · {formatUSD(order.totalCents)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${levelCls(order.level)}`}>
          {order.level} RISK · {order.score}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {order.flags.map((f, i) => (
          <span key={i} title={f.detail} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
            ⚠️ {f.signal}
          </span>
        ))}
      </div>
      {assessment && (
        <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm leading-relaxed text-zinc-700">🤖 {assessment}</p>
      )}
      {(order.level !== "LOW") && !assessment && (
        <button
          type="button" onClick={explain} disabled={busy}
          className="mt-3 rounded-full bg-violet-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? "🤖 Analyzing…" : "🤖 AI assessment"}
        </button>
      )}
    </div>
  );
}

export default function FraudPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/admin/fraud")
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setOrders(d.orders); else setOrders([]); })
      .catch(() => setOrders([]));
  }, []);

  const shown = orders?.filter((o) => filter === "ALL" || o.level === filter) ?? [];
  const high = orders?.filter((o) => o.level === "HIGH").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="🛡️ Fraud Check" subtitle="AI-scored order risk — review before you ship." />
        <div className="flex gap-2">
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((f) => (
            <button
              key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === f ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
            >
              {f}{f === "HIGH" && high > 0 ? ` (${high})` : ""}
            </button>
          ))}
        </div>
      </div>
      {orders === null ? (
        <p className="text-sm text-zinc-500">Scanning orders…</p>
      ) : shown.length === 0 ? (
        <div className={cardCls + " p-8 text-center"}>
          <p className="text-3xl">✅</p>
          <p className="mt-2 font-bold text-zinc-800">All clear</p>
          <p className="text-sm text-zinc-500">No orders match this risk level in the last 30 days.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((o) => <FraudCard key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
