export const dynamic = "force-dynamic";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = { title: "Terms of Service — ZUVO" };

const SECTIONS = [
  {
    h: "1. Demo service, no real commerce",
    p: "ZUVO is a demonstration marketplace. Nothing on this site constitutes an offer to sell real goods or services. Orders placed here are simulated records: no physical products are shipped, no real payments are processed, and no binding purchase contract is formed.",
  },
  {
    h: "2. Simulated payments",
    p: "Checkout uses a demo payment provider with selectable scenarios (success, declined, pending, cancelled, error). No real funds move. You agree not to enter real payment card numbers or banking credentials anywhere on this site.",
  },
  {
    h: "3. Demo rewards have no cash value",
    p: "Welcome rewards, referral credits, and promotions are labeled DEMO — NO CASH VALUE. They are simulated balances usable only inside this demo checkout flow. They cannot be withdrawn, transferred, sold, or redeemed for cash or real goods.",
  },
  {
    h: "4. Accounts",
    p: "You may browse and check out as a guest. Creating an account requires a valid email and a password of at least 8 characters. You are responsible for keeping your demo credentials safe; do not reuse a password you use elsewhere. We may suspend accounts that abuse the demo (for example, automated spam or review manipulation).",
  },
  {
    h: "5. Content you submit",
    p: "Reviews, messages, and addresses you submit must not contain unlawful, abusive, or sensitive personal content. By submitting content you grant the demo operator a license to store and display it within the demo. We may remove content at our discretion.",
  },
  {
    h: "6. Acceptable use",
    p: "Do not attempt to disrupt the demo, probe other users' data, or use automated tools to scrape or overload the site. Order lookup requires the order number plus the checkout email; do not attempt to enumerate other people's orders.",
  },
  {
    h: "7. Availability and changes",
    p: "This demo may be modified, reset, or taken offline at any time without notice. Catalog data, prices, promotions, and reward campaigns are illustrative and may change or disappear.",
  },
  {
    h: "8. No warranties",
    p: "The demo is provided as-is, without warranties of any kind. To the maximum extent permitted by law, the demo operator is not liable for any loss arising from use of this demonstration site.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Terms of Service"
        subtitle="The rules for using this demo marketplace"
      />
      <div className={`${cardCls} mt-6 space-y-6 p-6`}>
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-semibold text-zinc-900">{s.h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">{s.p}</p>
          </section>
        ))}
        <p className="text-xs text-zinc-500">
          Last updated: October 2026. This is a demonstration document, not legal advice.
        </p>
      </div>
    </div>
  );
}
