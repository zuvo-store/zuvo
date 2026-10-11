"use client";

import { useEffect, useState } from "react";
import { formatUSD } from "@/lib/money";

/**
 * Sticky bottom buy bar for mobile product pages.
 * Appears after scrolling past the main buy panel; tapping scrolls back up.
 */
export default function StickyBuyBar({
  productName,
  priceCents,
  image,
}: {
  productName: string;
  priceCents: number;
  image: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToBuy() {
    document.getElementById("buy-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/80 shadow-[0_-8px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="h-12 w-12 rounded-xl object-cover shadow"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{productName}</p>
          <p className="text-sm font-extrabold text-orange-600">{formatUSD(priceCents)}</p>
        </div>
        <button
          type="button"
          onClick={scrollToBuy}
          className="btn-3d shrink-0 rounded-full bg-gradient-to-b from-orange-500 to-orange-600 px-6 py-2.5 text-sm font-bold text-white"
        >
          Buy now
        </button>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
