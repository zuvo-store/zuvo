export const dynamic = "force-dynamic";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = { title: "Privacy Policy — ZUVO" };

const SECTIONS = [
  {
    h: "1. This is a demo environment",
    p: "ZUVO is a demonstration marketplace, not a production retailer. Treat every page as a sandbox: do not submit passwords, government IDs, real payment card numbers, or other sensitive personal information. Demo accounts and demo payments exist so you can explore without real-world risk.",
  },
  {
    h: "2. Information we store",
    p: "To make the storefront work we store: account details you provide (name, email, hashed password), shipping addresses you save, cart and wishlist contents, order records (items, totals, contact and delivery details you enter), product reviews you write, reward and referral records, and messages you send through the contact form.",
  },
  {
    h: "3. Cookies and sessions",
    p: "We use cookies to keep you signed in and to remember a guest cart for visitors who are not signed in. These cookies are required for checkout and account features to function. There is no third-party advertising tracking on ZUVO.",
  },
  {
    h: "4. How information is used",
    p: "Stored information is used only to operate the demo: authenticating you, fulfilling simulated orders, showing order history, applying demo rewards and promotions, and logging activity for demonstration and debugging purposes (an internal audit log). We do not sell personal data and there is no marketing email program beyond optional demo verification emails.",
  },
  {
    h: "5. Payments",
    p: "Payments are simulated by a demo provider. You select an outcome scenario (success, declined, pending, cancelled, error) and no real card is charged. Do not enter real card numbers anywhere on this site.",
  },
  {
    h: "6. Data retention and deletion",
    p: "Because this is a demo database, records may be reset or deleted at any time without notice. If you want your demo account and its data removed, contact us through the contact form and the demo team will handle the request on a best-effort basis.",
  },
  {
    h: "7. Changes to this policy",
    p: "This is a demonstration policy and may be updated as the demo evolves. The version shown on this page is the current one.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Privacy Policy"
        subtitle="How data is handled in this demo marketplace"
      />
      <div className={`${cardCls} mt-6 space-y-6 p-6`}>
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-semibold text-zinc-900">{s.h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">{s.p}</p>
          </section>
        ))}
        <p className="text-xs text-zinc-500">
          Last updated: October 2026. This is a demonstration policy for a demo
          marketplace; it is not legal advice.
        </p>
      </div>
    </div>
  );
}
