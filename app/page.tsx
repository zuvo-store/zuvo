export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ensureRewardForUser } from "@/lib/rewards";
import { formatUSD } from "@/lib/money";
import { toListItem } from "@/app/_shop/query";
import ProductCard from "@/components/ProductCard";
import RewardPopup from "@/components/RewardPopup";
import GuestRewardBanner from "@/components/GuestRewardBanner";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = {
  title: "ZUVO — Discover More. Shop Smarter.",
  description:
    "ZUVO is a demo marketplace with electronics, fashion, home goods and more. Discover more, shop smarter.",
};

const TRUST_CARDS = [
  {
    title: "Demo ordering",
    body: "This is a demonstration storefront. Orders are simulated end to end — no real goods are shipped and no real money moves.",
    href: "/help",
  },
  {
    title: "Simulated payments",
    body: "Checkout uses a demo payment provider. You can preview success, decline, and pending outcomes without a real card.",
    href: "/help",
  },
  {
    title: "Shipping info",
    body: "Illustrative delivery estimates: Standard 5–8 days, Express 2–4 days. See how shipping is calculated at checkout.",
    href: "/shipping",
  },
  {
    title: "Returns",
    body: "Demo returns policy: change your mind within 30 days of delivery in this simulated store. Learn how it works.",
    href: "/returns",
  },
];

export default async function HomePage() {
  const [categories, deals, featured, newest, user] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    db.product.findMany({
      where: { active: true, deal: true },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 12,
    }),
    db.product.findMany({
      where: { active: true, featured: true },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 8,
    }),
    db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getSessionUser(),
  ]);

  // Fill "Recommended" up to 8 with the highest-rated products if fewer are featured.
  let recommended = featured;
  if (recommended.length < 8) {
    const fill = await db.product.findMany({
      where: { active: true, id: { notIn: recommended.map((p) => p.id) } },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 8 - recommended.length,
    });
    recommended = [...recommended, ...fill];
  }

  const reward = user ? await ensureRewardForUser(user.id) : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Slim welcome nudge for guests only (signed-in users get the claimable RewardPopup below) */}
      {!user && <GuestRewardBanner />}
      {/* (a) Hero */}
      <section className="relative mt-6 overflow-hidden rounded-2xl bg-zinc-900 text-white">
        <img
          src="/hero.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative flex flex-col items-start gap-5 px-6 py-16 sm:px-12 sm:py-24">
          <p className="rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-300 ring-1 ring-orange-400/40">
            Demo marketplace
          </p>
          <h1 className="max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Discover More. Shop Smarter.
          </h1>
          <p className="max-w-lg text-base text-zinc-200 sm:text-lg">
            Thousands of products across electronics, fashion, home and more —
            with deals refreshed daily and a simulated checkout that is safe to explore.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              Shop Now
            </Link>
            <Link
              href="/deals"
              className="rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/20"
            >
              Explore Deals
            </Link>
          </div>
        </div>
      </section>

      {/* (b) Category grid */}
      <section className="mt-12">
        <SectionTitle
          title="Shop by category"
          actionHref="/categories"
          actionLabel="All categories"
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className={`${cardCls} group flex flex-col overflow-hidden transition hover:shadow-md`}
            >
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-zinc-100">
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-4xl font-extrabold text-orange-500">
                    {c.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-zinc-900 group-hover:text-orange-600">
                  {c.name}
                </h3>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{c.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* (c) Today's Deals */}
      {deals.length > 0 && (
        <section className="mt-12">
          <SectionTitle
            title="Today's Deals"
            subtitle="Limited-time demo discounts, refreshed daily"
            actionHref="/deals"
            actionLabel="View all deals"
          />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {deals.map((p) => (
              <ProductCard key={p.id} product={toListItem(p)} />
            ))}
          </div>
        </section>
      )}

      {/* (d) Recommended */}
      {recommended.length > 0 && (
        <section className="mt-12">
          <SectionTitle
            title="Recommended for you"
            subtitle="Top-rated picks from across the marketplace"
          />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={toListItem(p)} />
            ))}
          </div>
        </section>
      )}

      {/* (e) New Arrivals */}
      {newest.length > 0 && (
        <section className="mt-12">
          <SectionTitle title="New arrivals" subtitle="The latest additions to ZUVO" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newest.map((p) => (
              <ProductCard key={p.id} product={toListItem(p)} />
            ))}
          </div>
        </section>
      )}

      {/* (f) Rewards promo */}
      <section className="mt-12 overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="flex flex-col items-start gap-4 px-6 py-10 sm:px-12">
          <span className="rounded-md bg-black/25 px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
            DEMO — NO CASH VALUE
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Get a {formatUSD(2000)} Welcome reward
          </h2>
          <p className="max-w-xl text-sm text-orange-50 sm:text-base">
            Simulated demo reward for new accounts. Sign up, claim it in one step,
            and see how rewards apply at checkout. No real money involved — ever.
          </p>
          <Link
            href="/rewards"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-orange-600 shadow hover:bg-orange-50"
          >
            Learn about rewards
          </Link>
        </div>
      </section>

      {/* (g) Trust & support */}
      <section className="mt-12 mb-16">
        <SectionTitle title="Trust & support" subtitle="How this demo marketplace works" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_CARDS.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className={`${cardCls} block p-5 transition hover:shadow-md`}
            >
              <h3 className="font-semibold text-zinc-900">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t.body}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-orange-600">
                Learn more
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* (h) Reward popup for eligible signed-in users */}
      {reward && reward.status === "AVAILABLE" && (
        <RewardPopup reward={{ amountCents: reward.amountCents, status: reward.status }} />
      )}
    </div>
  );
}
