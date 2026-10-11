export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserReward } from "@/lib/rewards";
import { formatUSD } from "@/lib/money";
import { cardCls } from "@/components/ui";

const QUICK_LINKS = [
  { href: "/account/profile", title: "Profile", desc: "Name and email settings" },
  { href: "/account/addresses", title: "Addresses", desc: "Saved shipping addresses" },
  { href: "/account/orders", title: "Orders", desc: "Track and review orders" },
  { href: "/account/wishlist", title: "Wishlist", desc: "Items you saved for later" },
  { href: "/account/rewards", title: "Rewards", desc: "Signup reward status" },
  { href: "/account/referrals", title: "Referrals", desc: "Invite friends, earn credit" },
  { href: "/account/settings", title: "Settings", desc: "Password and account" },
];

export default async function AccountDashboard() {
  const user = await requireUser();
  const [orderCount, wishlistCount, reward] = await Promise.all([
    db.order.count({ where: { userId: user.id, status: { not: "DRAFT" } } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    getUserReward(user.id),
  ]);

  const stats = [
    { label: "Orders", value: String(orderCount), href: "/account/orders" },
    { label: "Wishlist", value: String(wishlistCount), href: "/account/wishlist" },
    {
      label: "Reward",
      value: reward ? formatUSD(reward.amountCents) : "—",
      href: "/account/rewards",
      sub: reward ? reward.status : "No active campaign",
    },
    { label: "Referral code", value: user.referralCode, href: "/account/referrals", mono: true },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-900">Welcome, {user.name}</h1>
      <p className="mb-8 text-sm text-zinc-500">{user.email}</p>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className={`${cardCls} block p-5 transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{s.label}</p>
            <p
              className={`mt-2 text-2xl font-extrabold text-zinc-900 ${
                s.mono ? "font-mono text-lg tracking-widest" : ""
              }`}
            >
              {s.value}
            </p>
            {s.sub && <p className="mt-1.5 text-xs text-zinc-500">{s.sub}</p>}
          </Link>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Manage your account</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`${cardCls} block p-5 transition hover:-translate-y-0.5 hover:shadow-md`}
          >
            <p className="font-semibold text-zinc-900">{l.title}</p>
            <p className="mt-1 text-sm text-zinc-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
