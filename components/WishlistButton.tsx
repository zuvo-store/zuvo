"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function WishlistButton({
  productId,
  initialActive,
  className = "",
}: {
  productId: string;
  initialActive: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(initialActive);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: active ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) {
        router.push(`/auth/login?next=${encodeURIComponent(pathname || "/")}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return;
      setActive(!active);
      router.refresh();
    } catch {
      /* stay as-is */
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-colors disabled:opacity-60 ${
        active
          ? "border-brand-200 bg-brand-50 text-brand-600"
          : "border-zinc-300 bg-white text-zinc-500 hover:text-brand-600"
      } ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" fill={active ? "currentColor" : "none"}>
        <path
          d="M10 17.5S3 12.6 3 7.9C3 5.2 5.1 3.5 7.4 3.5c1.1 0 2 .5 2.6 1.3.6-.8 1.5-1.3 2.6-1.3 2.3 0 4.4 1.7 4.4 4.4 0 4.7-7 9.6-7 9.6z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
