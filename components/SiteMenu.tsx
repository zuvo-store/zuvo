"use client";

import { useState } from "react";
import Link from "next/link";
import InteractiveZuzu from "@/components/InteractiveZuzu";
import LanguageToggle from "@/components/LanguageToggle";
import type { Locale } from "@/lib/i18n";

const SHOP_LINKS = [
  {
    href: "/",
    label: "Home",
    desc: "Back to the homepage",
    gradient: "from-orange-400 to-amber-500",
    icon: (
      <path d="M3 10.5 10 3l7 7.5M5 9.5V17h4v-4h6v4h4V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/categories",
    label: "Categories",
    desc: "Browse every department",
    gradient: "from-violet-400 to-purple-500",
    icon: (
      <path d="M4 4h6v6H4zM10 4h6v4h-6zM4 10h6v6H4zM10 10h6v6h-6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    ),
  },
  {
    href: "/deals",
    label: "Deals",
    desc: "Today's best discounts",
    gradient: "from-rose-400 to-red-500",
    icon: (
      <path d="M3 12V4h8l9 9-8 8-9-9ZM7.5 8.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/rewards",
    label: "Rewards",
    desc: "Your $20 welcome reward",
    gradient: "from-emerald-400 to-green-500",
    icon: (
      <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3M7 20h10l-1-7a4 4 0 1 0-8 0l-1 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/ai-chat",
    label: "AI Chat",
    desc: "Ask anything, shopping help",
    gradient: "from-orange-400 to-amber-500",
    icon: (
      <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M18.4 5.6l-2.1 2.1M21 12h-3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/track-order",
    label: "Track Order",
    desc: "Follow your delivery",
    gradient: "from-sky-400 to-blue-500",
    icon: (
      <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 18a1.5 1.5 0 1 0 0-.01M17 18a1.5 1.5 0 1 0 0-.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/account/vouchers",
    label: "My Vouchers",
    desc: "Your promo codes & discounts",
    gradient: "from-amber-400 to-orange-500",
    icon: (
      <path d="M3 8a2 2 0 0 1 2-2h14v3a2 2 0 0 0 0 6v3H5a2 2 0 0 1-2-2V8ZM13 6v2M13 11v2M13 16v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/account/referrals",
    label: "Invite Friends",
    desc: "Share & earn rewards",
    gradient: "from-pink-400 to-rose-500",
    icon: (
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 17c0-2.2 2.7-4 6-4s6 1.8 6 4M16 4l4 4-4 4M20 8h-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

const SUPPORT_LINKS = [
  { href: "/help", label: "Help & FAQ" },
  { href: "/contact", label: "Contact Us" },
];

const ACCOUNT_LINKS = [
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/orders", label: "My Orders" },
  { href: "/account", label: "My Account" },
];

export default function SiteMenu({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
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
        <div className="absolute left-0 top-full z-50 mt-2 max-h-[85vh] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-3xl border border-zinc-200/70 bg-gradient-to-b from-orange-50/80 to-white px-4 pb-8 pt-4 shadow-2xl">
          {/* Zuzu banner — tap for a surprise! (top of drawer, no search here) */}
          <div className="relative mb-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white shadow-lg shadow-orange-500/30">
            <InteractiveZuzu size="sm" showName={false} className="shrink-0" />
            <Link
              href="/rewards"
              onClick={() => setOpen(false)}
              className="min-w-0 flex-1"
            >
              <span className="block text-sm font-extrabold">Hey, I'm Zuzu! 👋</span>
              <span className="block truncate text-xs text-white/90">Tap me! Then claim your $20 reward →</span>
            </Link>
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-xl" />
          </div>

          <nav aria-label="Mobile">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Shop
            </p>
            <ul className="grid grid-cols-1 gap-2">
              {SHOP_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm transition active:scale-[0.98]"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-md`}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-zinc-900">{item.label}</span>
                      <span className="block truncate text-xs text-zinc-500">{item.desc}</span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-zinc-300">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="px-2 pb-2 pt-5 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Support
            </p>
            <ul className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
              {SUPPORT_LINKS.map((item, i) => (
                <li key={item.href} className={i > 0 ? "border-t border-zinc-100" : ""}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-700 transition active:bg-zinc-50"
                  >
                    {item.label}
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-zinc-300">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="px-2 pb-2 pt-5 text-xs font-bold uppercase tracking-widest text-zinc-400">
              Account
            </p>
            <ul className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm">
              {ACCOUNT_LINKS.map((item, i) => (
                <li key={item.href} className={i > 0 ? "border-t border-zinc-100" : ""}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-700 transition active:bg-zinc-50"
                  >
                    {item.label}
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-zinc-300">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="px-2 pb-2 pt-5 text-xs font-bold uppercase tracking-widest text-zinc-400">
              {locale === "ur" ? "زبان" : "Language"}
            </p>
            <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm">
              <span className="text-sm font-semibold text-zinc-700">
                {locale === "ur" ? "ویب سائٹ کی زبان" : "Website language"}
              </span>
              <LanguageToggle initial={locale} />
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
