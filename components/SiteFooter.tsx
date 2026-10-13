import Link from "next/link";
import Logo from "@/components/Logo";
import NewsletterForm from "@/components/NewsletterForm";
import { getLocale, t } from "@/lib/i18n";

export default async function SiteFooter() {
  const locale = await getLocale();
  const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t(locale, "footer.shop"),
      links: [
        { href: "/categories", label: t(locale, "nav.categories") },
        { href: "/deals", label: t(locale, "nav.deals") },
        { href: "/search?sort=newest", label: t(locale, "sec.new") },
      ],
    },
    {
      title: t(locale, "footer.help"),
      links: [
        { href: "/help", label: locale === "ur" ? "مدد مرکز" : "Help Center" },
        { href: "/contact", label: locale === "ur" ? "رابطہ کریں" : "Contact Us" },
        { href: "/track-order", label: locale === "ur" ? "آرڈر ٹریک کریں" : "Track Order" },
        { href: "/shipping", label: locale === "ur" ? "شپنگ کی معلومات" : "Shipping Info" },
        { href: "/returns", label: locale === "ur" ? "واپسی" : "Returns" },
      ],
    },
    {
      title: locale === "ur" ? "کمپنی" : "Company",
      links: [
        { href: "/about", label: t(locale, "footer.about") },
        { href: "/privacy", label: locale === "ur" ? "پرائیویسی پالیسی" : "Privacy Policy" },
        { href: "/terms", label: locale === "ur" ? "شرائط" : "Terms of Service" },
      ],
    },
    {
      title: locale === "ur" ? "اکاؤنٹ" : "Account",
      links: [
        { href: "/auth/login", label: locale === "ur" ? "سائن ان" : "Sign In" },
        { href: "/account/orders", label: locale === "ur" ? "میرے آرڈرز" : "My Orders" },
        { href: "/wishlist", label: locale === "ur" ? "وش لسٹ" : "Wishlist" },
        { href: "/account/rewards", label: locale === "ur" ? "میرے انعامات" : "My Rewards" },
      ],
    },
  ];

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Logo tagline={t(locale, "footer.tagline")} />
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
          <p>© 2026 ZUVO demo. {t(locale, "footer.rights")}</p>
          <p className="font-medium text-zinc-600">{t(locale, "footer.builtBy")}</p>
          <p>{locale === "ur" ? "ڈیمو مارکیٹ پلیس — کوئی اصل لین دین نہیں۔" : "Demo marketplace — no real transactions. Payments: DEMO only."}</p>
        </div>
      </div>
    </footer>
  );
}
