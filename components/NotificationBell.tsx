"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type N = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
};

const ICON: Record<string, string> = { ORDER: "🛒", CHAT: "💬", STOCK: "⚠️" };

/** Admin notification bell — sits next to the profile icon in the site header. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const d = await fetch("/api/admin/notifications").then((r) => r.json());
      if (d?.ok) {
        setItems(d.notifications);
        setUnread(d.unread);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      clearInterval(t);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  }

  async function openItem(n: N) {
    if (!n.readAt) {
      try {
        await fetch("/api/admin/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [n.id] }),
        });
      } catch {
        /* ignore */
      }
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
    }
    setOpen(false);
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-xl text-zinc-700 transition hover:bg-zinc-100"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-sm font-extrabold text-zinc-900">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "/admin"}
                  onClick={() => openItem(n)}
                  className={`flex gap-3 border-b border-zinc-50 px-4 py-3 transition hover:bg-orange-50/50 ${
                    n.readAt ? "" : "bg-orange-50/60"
                  }`}
                >
                  <span className="text-xl">{ICON[n.type] ?? "🔔"}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${n.readAt ? "font-medium text-zinc-700" : "font-bold text-zinc-900"}`}>
                      {n.title}
                    </span>
                    {n.body && <span className="block truncate text-xs text-zinc-500">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-zinc-400">{fmt(n.createdAt)}</span>
                  </span>
                  {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
