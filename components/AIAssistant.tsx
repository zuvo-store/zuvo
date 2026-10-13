"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  rating: number;
};

type Msg = {
  id: number;
  from: "user" | "zuzu";
  text: string;
  products?: ProductCard[];
  suggestions?: ProductCard[];
};

const QUICK_REPLIES = ["🔥 Show deals", "🎁 Gift ideas", "🚚 Delivery info", "⭐ ZUZU coins"];

function ProductCards({ products }: { products: ProductCard[] }) {
  if (!products || products.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      {products.map((p) => (
        <Link
          key={p.id}
          href={`/product/${p.slug}`}
          className="flex items-center gap-3 rounded-xl bg-white p-2 shadow-sm ring-1 ring-zinc-100 transition hover:shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.image ? (
            <img src={p.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-zinc-100 object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-xl">🛍️</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-zinc-800">{p.name}</p>
            <p className="text-xs">
              <span className="font-extrabold text-orange-600">${p.price.toFixed(2)}</span>
              {p.originalPrice && p.originalPrice > p.price && (
                <span className="ml-1.5 text-[10px] text-zinc-400 line-through">${p.originalPrice.toFixed(2)}</span>
              )}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white">View</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * Zuzu AI Shopping Assistant — floating chat widget.
 * - Waving Zuzu button (bottom-right)
 * - Multilingual smart replies (EN / Roman Urdu / Urdu)
 * - Product cards + suggestions inside chat
 */
export default function AIAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [waving, setWaving] = useState(false);
  const [talking, setTalking] = useState(false);
  const [input, setInput] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking anywhere outside (standard behavior)
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextId = () => ++idRef.current;

  // Wave every ~20s to attract attention
  useEffect(() => {
    const wave = () => {
      if (!open) {
        setWaving(true);
        setTimeout(() => setWaving(false), 2500);
      }
      waveTimer.current = setTimeout(wave, 18000 + Math.random() * 12000);
    };
    waveTimer.current = setTimeout(wave, 6000);
    return () => {
      if (waveTimer.current) clearTimeout(waveTimer.current);
    };
  }, [open ]);

  // Preload wave image
  useEffect(() => {
    const img = new Image();
    img.src = "/zuvo-assistant-wave.jpg";
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  function greet() {
    if (hasGreeted) return;
    setHasGreeted(true);
    setMessages([
      {
        id: nextId(),
        from: "zuzu",
        text: "Hey! I'm Zuzu! 👋 Your shopping buddy! Ask me for products, deals, or anything — I speak English, Urdu, aur Roman Urdu bhi! 🧡",
      },
    ]);
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    const userMsg: Msg = { id: nextId(), from: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setTalking(true);

    // Fetch with one automatic retry (handles brief deployments)
    async function attempt(): Promise<{ ok: boolean; [k: string]: unknown }> {
      const res = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!res.ok) throw new Error(`http-${res.status}`);
      return res.json();
    }

    try {
      let d: { ok: boolean; [k: string]: unknown };
      try {
        d = await attempt();
      } catch {
        await new Promise((r) => setTimeout(r, 2500));
        d = await attempt();
      }
      if (d.ok) {
        const msgs: Msg[] = [{
          id: nextId(),
          from: "zuzu",
          text: String(d.text ?? ""),
          products: Array.isArray(d.products) ? (d.products as ProductCard[]) : undefined,
        }];
        const sugs = Array.isArray(d.suggestions) ? (d.suggestions as ProductCard[]) : [];
        if (sugs.length > 0) {
          const sugLabel =
            d.lang === "ur" ? "💡 یہ بھی آپ کو پسند آئے گا:" : d.lang === "roman" ? "💡 Ye bhi pasand aayega apko:" : "💡 You might also love:";
          msgs.push({ id: nextId(), from: "zuzu", text: sugLabel, products: sugs });
        }
        setMessages((m) => [...m, ...msgs]);
      } else {
        setMessages((m) => [...m, { id: nextId(), from: "zuzu", text: "Oops! Kuch garbar ho gayi. Phir se try karo! 🧡" }]);
      }
    } catch {
      setMessages((m) => [...m, { id: nextId(), from: "zuzu", text: "🔧 Zuzu is updating right now! Try again in a moment! 🧡" }]);
    } finally {
      setLoading(false);
      setTalking(false);
    }
  }

  // Hide on AI Chat page or when minimized to header (all hooks already called above)
  const hidden = pathname === "/ai-chat" || minimized;

  // Sync minimized state + listen for restore from header icon
  useEffect(() => {
    try {
      if (localStorage.getItem("zuzu-minimized") === "1") setMinimized(true);
    } catch { /* ignore */ }
    const onOpen = () => {
      try { localStorage.removeItem("zuzu-minimized"); } catch { /* ignore */ }
      setMinimized(false);
      setOpen(true);
    };
    window.addEventListener("zuzu-open", onOpen);
    return () => window.removeEventListener("zuzu-open", onOpen);
  }, []);

  const [flying, setFlying] = useState(false);

  function minimizeToHeader() {
    // Animate flying up toward the header first, then actually minimize
    setOpen(false);
    setFlying(true);
    setTimeout(() => {
      setFlying(false);
      setMinimized(true);
      try { localStorage.setItem("zuzu-minimized", "1"); } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("zuzu-minimized"));
    }, 650);
  }

  if (hidden && !open) return null;

  return (
    <div ref={rootRef} className="fixed bottom-5 right-5 z-[90] flex flex-col items-end">
      {/* Chat panel */}
      {open && (
        <>
          {/* Click-outside-to-close overlay (transparent; panel + button stay above it) */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 cursor-default"
          />
          <div className="ai-chat-panel relative z-[1] mb-3 flex h-[min(480px,calc(100vh-140px))] max-h-[480px] w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl bg-gradient-to-b from-orange-50 to-white shadow-2xl ring-1 ring-orange-100">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/zuvo-assistant-wave.jpg"
              alt="Zuzu"
              className={`h-11 w-11 rounded-full bg-white object-cover ring-2 ring-white/60 ${talking ? "ai-talking" : ""}`}
            />
            <div className="flex-1">
              <p className="text-sm font-extrabold text-white">Zuzu Assistant</p>
              <p className="flex items-center gap-1 text-[11px] text-white/85">
                <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
                {talking || loading ? "typing…" : "● Online — Ask me anything! 💬"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1.5 text-white/90 transition hover:bg-white/20"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                    m.from === "user"
                      ? "rounded-br-md bg-zinc-900 text-white"
                      : "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.from === "zuzu" && <ProductCards products={m.products ?? []} />}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100">
                  <span className="ai-dot" /><span className="ai-dot" /><span className="ai-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies — only at start of chat, not every message */}
          {messages.length <= 2 && (
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="shrink-0 rounded-full bg-orange-100 px-3 py-1.5 text-[11px] font-bold text-orange-700 transition hover:bg-orange-200 active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-orange-100 bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Zuzu anything…"
              className="min-w-0 flex-1 rounded-full bg-zinc-100 px-4 py-2 text-sm outline-none placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-2 focus:ring-orange-300"
            />
            <button
              type="submit"
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md transition hover:opacity-90 active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10l16-7-7 16-2.5-6.5L2 10z" fill="currentColor" /></svg>
            </button>
          </form>
        </div>
      </>
      )}

      {/* Floating waving button (hidden when minimized to header) */}
      {!minimized && (
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) greet(); }}
        aria-label={open ? "Close Zuzu assistant" : "Chat with Zuzu"}
        className={`group relative z-[1] transition-all duration-500 ease-in ${flying ? "pointer-events-none -translate-y-[72vh] scale-[0.35] opacity-0" : ""}`}
      >
        <span className={`block h-16 w-16 overflow-hidden rounded-full shadow-xl shadow-orange-500/30 ring-4 ring-white transition-transform group-active:scale-90 ${waving && !open ? "ai-wave" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={open ? "/zuvo-mascot.jpg" : "/zuvo-assistant-wave.jpg"}
            alt="Zuzu AI assistant"
            draggable={false}
            className="h-full w-full object-cover"
          />
        </span>
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md">
            AI
          </span>
        )}
        {/* Minimize-to-header cross */}
        {!open && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Move Zuzu to header"
            title="Header me lagao"
            onClick={(e) => { e.stopPropagation(); minimizeToHeader(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); minimizeToHeader(); } }}
            className="absolute -left-1 -top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-zinc-800/90 text-white shadow-md transition hover:bg-zinc-900"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </span>
        )}
        {/* Attention bubble */}
        {waving && !open && (
          <span className="ai-wave-bubble absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-2xl rounded-br-sm bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-xl ring-1 ring-zinc-100">
            Need help? Ask me! 👋
          </span>
        )}
      </button>
      )}
    </div>
  );
}
