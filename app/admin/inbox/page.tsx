"use client";

import { useEffect, useRef, useState } from "react";

type Conv = {
  id: string;
  status: string;
  lastMessageAt: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string | null;
  preview: string;
  unread: number;
};
type Msg = { id: string; senderRole: string; body: string; createdAt: string };

export default function InboxPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | null>(null);

  async function loadConvs() {
    const d = await fetch("/api/chat/conversations").then((r) => r.json()).catch(() => null);
    if (d?.ok) {
      setConvs(d.conversations);
      if (active) {
        const updated = d.conversations.find((c: Conv) => c.id === active.id);
        if (updated) setActive(updated);
      }
    }
  }

  async function loadMessages(after?: string | null) {
    if (!active) return;
    const url = `/api/chat/messages?conversationId=${active.id}${after ? `&after=${encodeURIComponent(after)}` : ""}`;
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
    loadConvs();
    const t = setInterval(loadConvs, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    setMessages([]);
    lastRef.current = null;
    loadMessages(null);
    const t = setInterval(() => loadMessages(lastRef.current), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  // Refresh unread badges after reading
  useEffect(() => {
    if (messages.length > 0) loadConvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !active) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, conversationId: active.id }),
      });
      const d = await res.json();
      if (d?.ok) {
        setInput("");
        await loadMessages(lastRef.current);
        loadConvs();
      }
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-zinc-900">📥 Support Inbox</h1>
      <p className="mt-1 text-sm text-zinc-500">Customer messages, grouped by customer and order.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-bold text-zinc-700">Conversations ({convs.length})</p>
          </div>
          <div className="max-h-[560px] divide-y divide-zinc-50 overflow-y-auto">
            {convs.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-zinc-400">No messages yet.</p>
            ) : (
              convs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-orange-50/50 ${
                    active?.id === c.id ? "bg-orange-50" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-extrabold text-orange-700">
                    {c.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-zinc-900">{c.customerName}</p>
                      {c.unread > 0 && (
                        <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-extrabold text-white">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    {c.orderNumber && (
                      <p className="font-mono text-[11px] font-semibold text-orange-600">{c.orderNumber}</p>
                    )}
                    <p className="truncate text-xs text-zinc-500">{c.preview || "—"}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{fmtTime(c.lastMessageAt)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-h-[480px] flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-zinc-100">
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-10 text-center">
              <div>
                <p className="text-4xl">💬</p>
                <p className="mt-2 text-sm font-medium text-zinc-500">
                  Select a conversation to read and reply.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-zinc-100 px-5 py-3">
                <p className="text-sm font-extrabold text-zinc-900">{active.customerName}</p>
                <p className="text-xs text-zinc-500">
                  {active.customerEmail}
                  {active.orderNumber && (
                    <> · <span className="font-mono font-semibold text-orange-600">{active.orderNumber}</span></>
                  )}
                </p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 p-4">
                {messages.map((m) => {
                  if (m.senderRole === "SYSTEM") {
                    return (
                      <div key={m.id} className="flex justify-center px-4">
                        <p className="rounded-full bg-zinc-200/80 px-4 py-1.5 text-center text-xs font-medium text-zinc-600">
                          {m.body}
                        </p>
                      </div>
                    );
                  }
                  const mine = m.senderRole === "ADMIN";
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
                          <p className="mb-0.5 text-[11px] font-bold text-zinc-500">{active.customerName}</p>
                        )}
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-orange-100" : "text-zinc-400"}`}>
                          {fmtTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 border-t border-zinc-100 p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder={`Reply to ${active.customerName}…`}
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="shrink-0 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 active:scale-95 disabled:opacity-50"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
