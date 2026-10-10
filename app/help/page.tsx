export const dynamic = "force-dynamic";
import Link from "next/link";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = { title: "Help & FAQ — ZUVO" };

const FAQS = [
  {
    id: "demo-ordering",
    q: "Is ZUVO a real store?",
    a: "No. ZUVO is a demonstration marketplace. You can browse, add items to your cart, and go through checkout, but no real goods are shipped and no real money changes hands. Every payment is simulated by a demo provider.",
  },
  {
    id: "payments",
    q: "How do demo payments work?",
    a: "At checkout you choose a demo payment scenario — success, declined, pending, cancelled, or error — and the demo provider processes it. Use the scenarios to explore what each outcome looks like. Never enter a real card number; the demo provider does not accept or store real payment details.",
  },
  {
    id: "account",
    q: "Do I need an account to order?",
    a: "No. You can check out as a guest. An account lets you track orders in one place, keep a wishlist, manage addresses, and earn the demo welcome reward.",
  },
  {
    id: "rewards",
    q: "What is the welcome reward?",
    a: "New accounts are enrolled in a signup reward campaign (currently a $20 demo credit, labeled DEMO — NO CASH VALUE). Claim it from the rewards page and see how it applies at checkout. It has no cash value and cannot be withdrawn.",
  },
  {
    id: "shipping",
    q: "How long does shipping take?",
    a: "Shipping times on ZUVO are illustrative: Standard 5–8 business days, Express 2–4 business days. Standard shipping is $4.99, Express $12.99, and standard shipping is free on orders over $50. See the shipping page for details.",
  },
  {
    id: "returns",
    q: "Can I return an item?",
    a: "This demo store simulates a 30-day return window from delivery. Because no physical goods ship, returns are handled as simulated refunds to the demo payment. Read the returns policy for the full picture.",
  },
  {
    id: "track",
    q: "How do I track my order?",
    a: "Use the Track Order page with your order number (it looks like ZV-20250101-ABC123) and the email you used at checkout. Signed-in customers can also see every order under Account → Orders.",
  },
  {
    id: "reviews",
    q: "Can I review a product?",
    a: "Yes — sign in and open any product page to leave a star rating and a short review. Reviews are stored in this demo database and shown immediately.",
  },
  {
    id: "privacy",
    q: "What happens to my data?",
    a: "Account details, orders, and messages are stored in the demo database so the storefront can function. This is a demo environment — do not submit sensitive personal information. See the privacy page for details.",
  },
  {
    id: "contact",
    q: "How do I contact support?",
    a: "Use the contact form and we will log your message for the demo team. Response times are not guaranteed — this is a demonstration site, not a staffed support desk.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Help & FAQ"
        subtitle="Answers about this demo marketplace"
      />
      <div className="mt-6 flex flex-col gap-3">
        {FAQS.map((f) => (
          <details key={f.id} id={f.id} className={`${cardCls} group px-5 py-4`}>
            <summary className="cursor-pointer list-none font-semibold text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {f.q}
                <span className="text-orange-600 transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.a}</p>
          </details>
        ))}
      </div>
      <div className={`${cardCls} mt-8 p-5`}>
        <h2 className="font-semibold text-zinc-900">Still need help?</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Send us a message and the demo team will log it for review.
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Contact us
        </Link>
      </div>
    </div>
  );
}
