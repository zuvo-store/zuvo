import Link from "next/link";
import { headers } from "next/headers";
import { getAnnouncements } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import Logo from "@/components/Logo";
import SearchBox from "@/components/SearchBox";
import AccountMenu from "@/components/AccountMenu";
import SiteMenu from "@/components/SiteMenu";
import CartIconButton from "@/components/CartIconButton";
import DealsTicker from "@/components/DealsTicker";
import HeaderZuzuButton from "@/components/HeaderZuzuButton";
import LanguageToggle from "@/components/LanguageToggle";
import NotificationBell from "@/components/NotificationBell";
import { getLocale, t } from "@/lib/i18n";

export default async function SiteHeader() {
  const hdrs = await headers();
  const path = hdrs.get("x-pathname") ?? hdrs.get("next-url") ?? "";

  // Minimal header on auth pages — logo only, no search/cart/nav (professional auth UX)
  if (path.startsWith("/auth/")) {
    return (
      <header className="border-b border-zinc-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4">
          <Link href="/" aria-label="ZUVO home">
            <Logo tagline="Discover More. Shop Smarter." />
          </Link>
        </div>
      </header>
    );
  }

  const [announcements, user, cart, locale] = await Promise.all([
    getAnnouncements(),
    getSessionUser(),
    getCart(),
    getLocale(),
  ]);
  const announcement = announcements[0];
  const NAV = [
    { href: "/categories", label: t(locale, "nav.categories") },
    { href: "/deals", label: t(locale, "nav.deals") },
    { href: "/rewards", label: locale === "ur" ? "انعامات" : "Rewards" },
    { href: "/track-order", label: locale === "ur" ? "آرڈر ٹریک کریں" : "Track Order" },
  ];

  return (
    <>
      <DealsTicker />
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 shadow-lg shadow-zinc-900/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-4">
          <SiteMenu locale={locale} />
          <Logo tagline="Discover More. Shop Smarter." className="[&>span:last-child]:hidden lg:[&>span:last-child]:block" />
          <div className="hidden min-w-0 flex-1 px-2 md:block">
            <SearchBox placeholder={t(locale, "search.placeholder")} />
          </div>
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
            <span className="hidden md:inline-flex">
              <LanguageToggle initial={locale} />
            </span>
            <HeaderZuzuButton />
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 17.5S3 12.6 3 7.9C3 5.2 5.1 3.5 7.4 3.5c1.1 0 2 .5 2.6 1.3.6-.8 1.5-1.3 2.6-1.3 2.3 0 4.4 1.7 4.4 4.4 0 4.7-7 9.6-7 9.6z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <CartIconButton count={cart.count} />
            {user?.role === "ADMIN" ? <NotificationBell /> : null}
            <AccountMenu
              user={user ? { name: user.name, email: user.email, role: user.role } : null}
            />
          </div>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 md:hidden">
          <SearchBox placeholder={t(locale, "search.placeholder")} />
        </div>
      </header>
    </>
  );
}
