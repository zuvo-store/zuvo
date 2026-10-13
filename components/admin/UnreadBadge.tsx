"use client";

import { useEffect, useState } from "react";

/** Red unread-message badge. Polls the chat API; renders nothing when zero. */
export default function UnreadBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const d = await fetch("/api/chat/conversations").then((r) => r.json());
        if (alive && d?.ok) setCount(d.totalUnread ?? 0);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (count === 0) return null;
  return (
    <span
      aria-label={`${count} unread messages`}
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
