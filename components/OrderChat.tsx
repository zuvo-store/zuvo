"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; senderRole: string; body: string; createdAt: string };

/** Live chat thread for one order. Polls for new messages every 4s. */
export default function OrderChat({ orderId }: { orderId: string }) {
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | null>(null);

  // Resolve conversation id once
  useEffect(() => {
    fetch(`/api/chat/by-order?orderId=${orderId}`)
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setConvId(d.conversationId); })
      .catch(() => {});
  }, [orderId]);

  async function load(after?: string | null) {
    if (!convId) return;
    const url = `/api/chat/messages?conversationId=${convId}${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const d = await fetch(url).then((r) => r.json()).catch(() => null);
    if (d?.ok && Array.isArray(d.messages)) {
      if (after) {
        if (d.messages.length > 0) {
          setMessages((prev) => [...prev, ...d.messages]);
          lastRef.current = d.messages[d.messages.length - 1].createdAt;
        }
      } else {
        setMessages(d.messages);
        lastRef.current = d.messages.length > 0 ? d.messages[d.messages.length - 1].createdAt : null;
      }
    }
  }

  useEffect(() => {
    if (!convId) return;
    load(null);
    const t = setInterval(() => load(lastRef.current), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !convId) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, conversationId: convId }),
      });
      const d = await res.json();
      if (d?.ok) {
        setInput("");
        await load(lastRef.current);
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-80 flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl bg-zinc-50 p-3">
        {messages.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-400">
            👋 Questions about this order? Message us here — we usually reply within a few hours.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderRole === "CUSTOMER";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    mine
                      ? "rounded-br-md bg-orange-500 text-white"
                      : "rounded-bl-md bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-100"
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[11px] font-bold text-orange-600">ZUVO Support</p>
                  )}
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Type your message…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !input.trim() || !convId}
          className="shrink-0 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 active:scale-95 disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
