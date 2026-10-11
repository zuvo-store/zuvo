"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Cart icon in the header. Normally links to /cart, but when the user is
 * already on the cart page, clicking it goes back (toggles the cart closed).
 */
export default function CartIconButton({ count }: { count: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isCartPage = pathname === "/cart";

  function handleClick(e: React.MouseEvent) {
    if (!isCartPage) return; // let the Link navigate to /cart
    e.preventDefault();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <Link
      href="/cart"
      onClick={handleClick}
      aria-label={
        isCartPage
          ? "Close cart"
          : `Cart, ${count} ${count === 1 ? "item" : "items"}`
      }
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 ${
        isCartPage ? "bg-zinc-100" : ""
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 4h2l2.2 10.5a1 1 0 0 0 1 .8h7.6a1 1 0 0 0 1-.8L18.5 8H6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="17" r="1.2" fill="currentColor" />
        <circle cx="15" cy="17" r="1.2" fill="currentColor" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
