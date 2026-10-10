export const dynamic = "force-dynamic";
import Link from "next/link";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = { title: "About — ZUVO" };

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="About ZUVO"
        subtitle="Discover More. Shop Smarter."
      />
      <div className={`${cardCls} mt-6 space-y-4 p-6 text-zinc-700 leading-relaxed`}>
        <p>
          ZUVO is a <strong>demonstration e-commerce marketplace</strong> built to showcase
          a complete online shopping experience: browsing departments, searching and
          filtering products, reading reviews, managing a cart and wishlist, checking
          out with simulated payments, tracking orders, and earning demo rewards.
        </p>
        <p>
          Everything here is simulated. The catalog, prices, and product images are
          generated for the demo; orders do not ship physical goods; and the payment
          step uses a demo provider with selectable outcomes (success, declined,
          pending, and more) so you can safely explore every path of a checkout flow.
        </p>
        <p>
          ZUVO was created as a learning and evaluation project: a realistic
          storefront where every button does something real, but nothing costs real
          money. Rewards carry a <strong>DEMO — NO CASH VALUE</strong> label and can
          never be withdrawn or redeemed for cash.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/search"
          className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Start shopping
        </Link>
        <Link
          href="/help"
          className="rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          How it works
        </Link>
      </div>
    </div>
  );
}
