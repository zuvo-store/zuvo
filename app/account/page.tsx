export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserReward } from "@/lib/rewards";
import { formatUSD } from "@/lib/money";
import Reveal from "@/components/Reveal";

const QUICK_LINKS = [
  { href: "/account/profile", title: "Profile", desc: "Name and email settings" },
  { href: "/account/addresses", title: "Addresses", desc: "Saved shipping addresses" },
  { href: "/account/orders", title: "Orders", desc: "Track and review orders" },
  { href: "/account/wishlist", title: "Wishlist", desc: "Items you saved for later" },
  { href: "/account/rewards", title: "Rewards", desc: "Signup reward status" },
  { href: "/account/vouchers", title: "My Vouchers", desc: "Promo codes: available & expired" },
  { href: "/account/referrals", title: "Referrals", desc: "Invite friends, earn credit" },
  { href: "/account/settings", title: "Settings", desc: "Password and account" },
];

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-zinc-400">
      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function AccountDashboard() {
  const user = await requireUser();
  const [orderCount, wishlistCount, reward, dbUser] = await Promise.all([
    db.order.count({ where: { userId: user.id, status: { not: "DRAFT" } } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    getUserReward(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { zuzuPoints: true } }),
  ]);
  const zuzuPoints = dbUser?.zuzuPoints ?? 0;

  const creditCents = reward?.status === "CLAIMED" ? reward.amountCents : 0;
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  const menuRows = [
    {
      href: "/account/orders",
      title: "Your orders",
      badge: orderCount > 0 ? String(orderCount) : null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 7V6a4 4 0 018 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/account/wishlist",
      title: "Wishlist",
      badge: wishlistCount > 0 ? String(wishlistCount) : null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 20.5S3.5 15.4 3.5 9.6C3.5 7 5.5 5.5 7.8 5.5c1.3 0 2.4.6 3.2 1.6.8-1 1.9-1.6 3.2-1.6 2.3 0 4.3 1.5 4.3 4.1 0 5.8-8.5 10.9-8.5 10.9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      href: "/account/vouchers",
      title: "My vouchers",
      badge: null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M14 6v2M14 11v2M14 16v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1 3" />
        </svg>
      ),
    },
    {
      href: "/account/rewards",
      title: "My rewards",
      badge: reward?.status === "AVAILABLE" ? "1" : null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="8" width="17" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 8v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 8S12 4 8.5 4 5 6 7 8h5zM12 8s0-4 3.5-4S19 6 17 8h-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      href: "/account/orders",
      label: "History",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/account/rewards",
      label: "Play & Earn",
      dot: reward?.status === "AVAILABLE",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="8" width="17" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 8v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/account/addresses",
      label: "Addresses",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
    },
    {
      href: "/account/settings",
      label: "Settings",
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 8h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
      {/* Profile header */}
      <div className="flex items-center gap-3 py-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-2xl font-bold text-white">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-zinc-900">{user.name}</h1>
          <p className="truncate text-sm text-zinc-500">{user.email}</p>
        </div>
        <Link
          href="/account/settings"
          aria-label="Account settings"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M19 12a7 7 0 01-.1 1.2l2 1.5-2 3.4-2.3-1a7 7 0 01-2 1.2L14.2 20h-4l-.4-2.7a7 7 0 01-2-1.2l-2.3 1-2-3.4 2-1.5A7 7 0 015 12a7 7 0 01.1-1.2l-2-1.5 2-3.4 2.3 1a7 7 0 012-1.2L9.8 4h4l.4 2.7a7 7 0 012 1.2l2.3-1 2 3.4-2 1.5c.06.4.1.8.1 1.2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          {reward?.status === "AVAILABLE" && (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
          )}
        </Link>
      </div>

      {/* Credit balance + coupons + ZUZU points */}
      <Reveal>
      <div className="grid grid-cols-3 divide-x divide-zinc-200 rounded-2xl border border-zinc-200 bg-white py-4 shadow-sm">
        <Link href="/account/rewards" className="px-4 text-center">
          <p className="text-2xl font-extrabold text-zinc-900">{formatUSD(creditCents)}</p>
          <p className="mt-0.5 text-sm text-zinc-600">Credit balance</p>
        </Link>
        <Link href="/deals" className="px-4 text-center">
          <p className="text-2xl font-extrabold text-zinc-900">2</p>
          <p className="mt-0.5 text-sm text-zinc-600">Coupons & offers</p>
        </Link>
        <div className="px-4 text-center">
          <p className="text-2xl font-extrabold text-amber-600">⭐ {zuzuPoints.toLocaleString()}</p>
          <p className="mt-0.5 text-sm text-zinc-600">ZUZU points</p>
          <p className="mt-0.5 text-[11px] text-zinc-400">1000 pts = $1</p>
        </div>
      </div>
      </Reveal>

      {/* Coupon bundle banner */}
      <Reveal delay={100}>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg font-extrabold text-amber-700">
          $
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-zinc-900">$20.00 coupon bundle</p>
          <p className="truncate text-sm text-zinc-500">With qualifying order(s)</p>
        </div>
        <Link
          href="/rewards/claim"
          className="shrink-0 rounded-full bg-orange-500 px-6 py-2 text-sm font-bold text-white shadow hover:bg-orange-600"
        >
          {reward?.status === "CLAIMED" ? "Claimed" : "Get"}
        </Link>
      </div>
      </Reveal>

      {/* Menu rows */}
      <nav className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm" aria-label="Account">
        {menuRows.map((row, i) => (
          <Link
            key={row.href}
            href={row.href}
            className={`flex items-center gap-3 px-4 py-4 transition hover:bg-zinc-50 ${
              i > 0 ? "border-t border-zinc-100" : ""
            }`}
          >
            <span className="text-zinc-800">{row.icon}</span>
            <span className="flex-1 text-base font-semibold text-zinc-900">{row.title}</span>
            {row.badge && (
              <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-bold text-white">
                {row.badge}
              </span>
            )}
            <Chevron />
          </Link>
        ))}
      </nav>

      {/* Quick actions */}
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-zinc-200 bg-white py-4 shadow-sm">
        {quickActions.map((a) => (
          <Link key={a.label} href={a.href} className="flex flex-col items-center gap-1.5 px-1 text-center">
            <span className="relative text-zinc-800">
              {a.icon}
              {a.dot && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
              )}
            </span>
            <span className="text-xs font-medium text-zinc-700">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Trust strip */}
      <div className="mt-4 flex items-center justify-center gap-6 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-green-700">
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Free shipping
        </span>
        <span className="h-4 w-px bg-orange-200" aria-hidden="true" />
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Demo rewards
        </span>
      </div>

      {/* All settings links */}
      <h2 className="mb-3 mt-8 text-lg font-bold text-zinc-900">Manage your account</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <p className="font-semibold text-zinc-900">{l.title}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
