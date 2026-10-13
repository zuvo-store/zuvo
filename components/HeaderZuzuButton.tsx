"use client";

import { useEffect, useState } from "react";

/* Mini Zuzu button in the header (heart-sized) — appears when the
   floating assistant is minimized via its ✕ button. */
export default function HeaderZuzuButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("zuzu-minimized") === "1") setVisible(true);
    } catch { /* ignore */ }
    const onMin = () => setVisible(true);
    const onOpen = () => setVisible(false);
    window.addEventListener("zuzu-minimized", onMin);
    window.addEventListener("zuzu-open", onOpen);
    return () => {
      window.removeEventListener("zuzu-minimized", onMin);
      window.removeEventListener("zuzu-open", onOpen);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("zuzu-open"))}
      aria-label="Chat with Zuzu"
      title="Zuzu Assistant"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-zinc-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/zuvo-assistant-wave.jpg"
        alt="Zuzu"
        draggable={false}
        className="h-7 w-7 rounded-full object-cover ring-2 ring-orange-200"
      />
      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow">
        AI
      </span>
    </button>
  );
}
