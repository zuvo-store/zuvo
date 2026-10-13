"use client";
import { useEffect, useState } from "react";
import { cardCls, SectionTitle } from "@/components/ui";
import { formatUSD } from "@/lib/money";

type CartItem = { name: string; qty: number; image: string | null };

type Cart = {
  userId: string;
  name: string | null;
  email: string;
  itemCount: number;
  totalCents: number;
  lastActivity: string;
  items: CartItem[];
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CartCard({ cart }: { cart: Cart }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai/cart-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: cart.name, items: cart.items.map((i) => `${i.qty}× ${i.name}`), total: cart.totalCents / 100 }),
      });
      const d = await res.json();
      if (d?.ok) setMsg(d.message);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function send() {
    if (!msg) return;
    const lines = msg.split("\n");
    const subject = (lines.find((l) => l.toLowerCase().startsWith("subject:")) ?? "Subject: Your ZUVO cart is waiting 🛒").replace(/^subject:\s*/i, "");
    const body = lines.filter((l) => !l.toLowerCase().startsWith("subject:")).join("\n").trim() || msg;
    setSending(true);
    try {
      const res = await fetch("/api/admin/carts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cart.email, subject, body }),
      });
      const d = await res.json();
      if (d?.ok) setSent(true);
    } catch { /* ignore */ } finally { setSending(false); }
  }

  return (
    <div className={cardCls + " p-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-zinc-900">{cart.name || "Customer"}</p>
          <p className="text-sm text-zinc-500">{cart.email}</p>
          <p className="mt-1 text-xs text-zinc-400">Abandoned {timeAgo(cart.lastActivity)}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-orange-600">{formatUSD(cart.totalCents)}</p>
          <p className="text-xs text-zinc-500">{cart.itemCount} items</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {cart.items.map((it, idx) => (
          <li key={idx} className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2">
            {it.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.image} alt="" className="h-10 w-10 shrink-0 rounded-lg bg-white object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-base">
                📦
              </span>
            )}
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{it.name}</p>
            <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-bold text-zinc-700">
              ×{it.qty}
            </span>
          </li>
        ))}
      </ul>
      {msg && (
        <div className="mt-3 whitespace-pre-line rounded-xl bg-violet-50 p-3 text-sm text-zinc-700">{msg}</div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button" onClick={generate} disabled={busy}
          className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "✨ Writing…" : msg ? "↻ Regenerate message" : "✨ AI win-back message"}
        </button>
        {msg && !sent && (
          <button
            type="button" onClick={send} disabled={sending}
            className="rounded-full bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {sending ? "Sending…" : "📧 Send email"}
          </button>
        )}
        {sent && <span className="self-center text-sm font-bold text-emerald-600">✓ Sent</span>}
      </div>
    </div>
  );
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<Cart[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/carts")
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setCarts(d.carts); else setCarts([]); })
      .catch(() => setCarts([]));
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle title="Abandoned Carts" subtitle="Shoppers who left items behind — win them back with AI-crafted emails." />
      {carts === null ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cardCls + " animate-pulse p-5"}>
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-zinc-100" />
                  <div className="h-3 w-48 rounded bg-zinc-100" />
                </div>
                <div className="h-6 w-20 rounded bg-zinc-100" />
              </div>
              <div className="mt-3 h-12 rounded-xl bg-zinc-100" />
              <div className="mt-3 h-9 w-44 rounded-full bg-zinc-100" />
            </div>
          ))}
        </div>
      ) : carts.length === 0 ? (
        <div className={cardCls + " p-8 text-center"}>
          <p className="text-3xl">🎉</p>
          <p className="mt-2 font-bold text-zinc-800">No abandoned carts</p>
          <p className="text-sm text-zinc-500">Every shopper either checked out or is still browsing.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {carts.map((c) => <CartCard key={c.userId} cart={c} />)}
        </div>
      )}
    </div>
  );
}
