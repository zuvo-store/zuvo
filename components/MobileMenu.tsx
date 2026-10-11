"use client";

import { useState } from "react";
import Link from "next/link";
import SearchBox from "@/components/SearchBox";

const SHOP_LINKS = [
  {
    href: "/",
    label: "Home",
    desc: "Back to the homepage",
    icon: (
      <path d="M3 10.5 10 3l7 7.5M5 9.5V17h4v-4h6v4h4V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/categories",
    label: "Categories",
    desc: "Browse every department",
    icon: (
      <path d="M4 4h6v6H4zM10 4h6v4h-6zM4 10h6v6H4zM10 10h6v6h-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    ),
  },
  {
    href: "/deals",
    label: "Deals",
    desc: "Today's best discounts",
    icon: (
      <path d="M3 12V4h8l9 9-8 8-9-9ZM7.5 8.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/rewards",
    label: "Rewards",
    desc: "Your $20 welcome reward",
    icon: (
      <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3M7 20h10l-1-7a4 4 0 1 0-8 0l-1 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/track-order",
    label: "Track Order",
    desc: "Follow your delivery",
    icon: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a1.5 1.5 0 1 0 0-.01M17 18a1.5 1.5 0 1 0 0-.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

const ACCOUNT_LINKS = [
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account", label: "My Account" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-50 max-h-[80vh] overflow-y-auto border-b border-zinc-200 bg-white px-4 pb-6 pt-3 shadow-xl">
          <SearchBox className="mb-4" />
          <nav aria-label="Mobile">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Shop
            </p>
            <ul className="space-y-1">
              {SHOP_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-zinc-100"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-brand-700">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-zinc-900">{item.label}</span>
                      <span className="block text-xs text-zinc-500">{item.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Account
            </p>
            <ul className="space-y-1">
              {ACCOUNT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
