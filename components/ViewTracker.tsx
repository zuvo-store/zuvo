"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Fires an anonymous page-view ping on every route change for visitor stats.
 * Lightweight, silent, never affects the page.
 */
export default function ViewTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastSent.current) return;
    if (pathname.startsWith("/admin")) return;
    lastSent.current = pathname;
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
