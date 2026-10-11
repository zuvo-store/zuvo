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
import { SectionTitle, cardCls, cardFlushCls } from "@/components/ui";
import VerifiedBanner from "@/components/VerifiedBanner";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import InteractiveZuzu from "@/components/InteractiveZuzu";
import Reveal from "@/components/Reveal";
import { Suspense } from "react";

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
      include: {
        products: {
          where: { active: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { slug: true, images: true },
        },
      },
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
      <Suspense fallback={null}>
        <VerifiedBanner />
      </Suspense>
      {/* Slim welcome nudge for guests only (signed-in users get the claimable RewardPopup below) */}
      {!user && <GuestRewardBanner />}
      {/* (a) Hero — premium 3D mascot, store branding */}
      <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 text-zinc-900 shadow-lg">
        {/* soft 3D blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-orange-200/50 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative grid items-center gap-6 px-6 py-10 sm:px-12 sm:py-14 lg:grid-cols-2 lg:py-16">
          <div className="flex flex-col items-start gap-5">
            <p className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-orange-600 shadow-sm ring-1 ring-orange-200 backdrop-blur">
              ✨ New deals every day
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Discover More.
              <span className="block bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Shop Smarter.
              </span>
            </h1>
            <p className="max-w-lg text-base text-zinc-600 sm:text-lg">
              ZUVO brings you thousands of quality products across electronics,
              fashion, home and more — at prices you&apos;ll love.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/search"
                className="rounded-full bg-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 hover:shadow-orange-600/40"
              >
                Shop Now
              </Link>
              <Link
                href="/deals"
                className="rounded-full bg-white/80 px-8 py-3.5 text-sm font-bold text-zinc-900 shadow ring-1 ring-zinc-900/10 backdrop-blur transition hover:bg-white"
              >
                Explore Deals
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-green-500">
                  <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Free shipping
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-green-500">
                  <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Easy returns
              </span>
              <span className="flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-green-500">
                  <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Secure checkout
              </span>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-md flex-col items-center justify-center px-12 py-10 lg:max-w-none">
            <InteractiveZuzu size="lg" greet />
            {/* floating deal badges — tucked in corners, clear of Zuzu */}
            <div className="absolute left-1 top-1 animate-bounce rounded-xl bg-white px-2.5 py-1 shadow-md ring-1 ring-zinc-100">
              <p className="text-[9px] font-bold text-zinc-500">UP TO</p>
              <p className="text-sm font-extrabold text-orange-600">50% OFF</p>
            </div>
            <div className="absolute right-1 top-1/3 animate-bounce rounded-xl bg-white px-2.5 py-1 shadow-md ring-1 ring-zinc-100 [animation-delay:0.5s]">
              <p className="text-[9px] font-bold text-zinc-500">NEW USER</p>
              <p className="text-sm font-extrabold text-green-600">$20 REWARD</p>
            </div>
          </div>
        </div>
      </section>

      {/* (b) Category grid */}
      <Reveal>
      <section className="mt-12">
        <SectionTitle
          title="Shop by category"
          actionHref="/categories"
          actionLabel="All categories"
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => {
            // Use the first product's real photo (all products have /p/<slug>.jpg).
            const firstProduct = c.products[0];
            const cardImage = firstProduct ? `/p/${firstProduct.slug}.jpg` : c.image;
            return (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className={`${cardFlushCls} group flex flex-col overflow-hidden`}
              >
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50">
                  {cardImage ? (
                    <img
                      src={cardImage}
                      alt={c.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110 group-hover:rotate-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-4xl font-extrabold text-orange-500">
                      {c.name.charAt(0)}
                    </span>
                  )}
                  <span aria-hidden="true" className="shimmer pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-zinc-900 transition-colors group-hover:text-orange-600">
                    {c.name}
                  </h3>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{c.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      </Reveal>

      {/* (c) Discount banners */}
      <Reveal>
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/deals"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 p-5 text-white shadow-sm transition hover:shadow-md"
        >
          <p className="text-3xl font-extrabold">Up to 50% off</p>
          <p className="mt-1 text-sm text-white/90">Clearance deals · limited stock</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
            Shop now
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="transition group-hover:translate-x-0.5">
              <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
        <Link
          href="/rewards/claim"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-sm transition hover:shadow-md"
        >
          <p className="text-3xl font-extrabold">$20 reward</p>
          <p className="mt-1 text-sm text-white/90">Free welcome voucher · claim once</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
            Claim now
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="transition group-hover:translate-x-0.5">
              <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
        <Link
          href="/categories"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 p-5 text-white shadow-sm transition hover:shadow-md"
        >
          <p className="text-3xl font-extrabold">New arrivals</p>
          <p className="mt-1 text-sm text-white/80">Fresh picks across 8 categories</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold">
            Explore
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="transition group-hover:translate-x-0.5">
              <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </section>
      </Reveal>

      {/* (d) Today's Deals */}
      {deals.length > 0 && (
        <Reveal>
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
        </Reveal>
      )}

      {/* (d) Recommended */}
      {recommended.length > 0 && (
        <Reveal>
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
        </Reveal>
      )}

      {/* (e) New Arrivals */}
      {newest.length > 0 && (
        <Reveal>
        <section className="mt-12">
          <SectionTitle title="New arrivals" subtitle="The latest additions to ZUVO" />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {newest.map((p) => (
              <ProductCard key={p.id} product={toListItem(p)} />
            ))}
          </div>
        </section>
        </Reveal>
      )}

      {/* (f) Rewards promo */}
      <Reveal>
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
      </Reveal>

      {/* (g) Trust & support */}
      <Reveal>
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
      </Reveal>

      {/* (h) Reward popup for eligible signed-in users */}
      {reward && reward.status === "AVAILABLE" && (
        <RewardPopup reward={{ amountCents: reward.amountCents, status: reward.status }} />
      )}

      {/* (i) Recently viewed */}
      <Suspense fallback={null}>
        <RecentlyViewed />
      </Suspense>
    </div>
  );
}
