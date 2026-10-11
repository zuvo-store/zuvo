import Link from "next/link";
import Logo from "@/components/Logo";
import NewsletterForm from "@/components/NewsletterForm";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { href: "/categories", label: "Categories" },
      { href: "/deals", label: "Today's Deals" },
      { href: "/search?sort=newest", label: "New Arrivals" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/help", label: "Help Center" },
      { href: "/contact", label: "Contact Us" },
      { href: "/track-order", label: "Track Order" },
      { href: "/shipping", label: "Shipping Info" },
      { href: "/returns", label: "Returns" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About ZUVO" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/auth/login", label: "Sign In" },
      { href: "/account/orders", label: "My Orders" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/account/rewards", label: "My Rewards" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo tagline="Discover More. Shop Smarter." />
            <p className="mt-4 max-w-xs text-sm text-zinc-500">
              ZUVO is a demo marketplace. Browse great products, track orders, and try the
              full shopping experience.
            </p>
            <p className="mt-5 text-sm font-semibold text-zinc-900">
              Get deals in your inbox
            </p>
            <NewsletterForm />
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={`Footer — ${col.title}`}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-900">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-zinc-500 hover:text-brand-700 hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>© 2026 ZUVO demo. All rights reserved.</p>
          <p className="font-medium text-zinc-600">Built by Haider Malik &amp; Usman Anwar</p>
          <p>Demo marketplace — no real transactions. Payments: DEMO only.</p>
        </div>
      </div>
    </footer>
  );
}
