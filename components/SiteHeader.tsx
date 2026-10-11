import Link from "next/link";
import { getAnnouncements } from "@/lib/settings";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import Logo from "@/components/Logo";
import SearchBox from "@/components/SearchBox";
import AccountMenu from "@/components/AccountMenu";
import MobileMenu from "@/components/MobileMenu";
import CartIconButton from "@/components/CartIconButton";
import DealsTicker from "@/components/DealsTicker";

const NAV = [
  { href: "/categories", label: "Categories" },
  { href: "/deals", label: "Deals" },
  { href: "/rewards", label: "Rewards" },
  { href: "/track-order", label: "Track Order" },
];

export default async function SiteHeader() {
  const [announcements, user, cart] = await Promise.all([
    getAnnouncements(),
    getSessionUser(),
    getCart(),
  ]);
  const announcement = announcements[0];

  return (
    <>
      <DealsTicker />
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 shadow-lg shadow-zinc-900/5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <MobileMenu />
          <Logo tagline="Discover More. Shop Smarter." />
          <SearchBox className="hidden min-w-0 flex-1 md:block" />
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
            <AccountMenu
              user={user ? { name: user.name, email: user.email, role: user.role } : null}
            />
          </div>
        </div>
        <div className="border-t border-zinc-100 px-4 py-2 md:hidden">
          <SearchBox />
        </div>
      </header>
    </>
  );
}
