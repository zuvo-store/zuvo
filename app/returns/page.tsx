export const dynamic = "force-dynamic";
import Link from "next/link";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = { title: "Returns Policy — ZUVO" };

export default function ReturnsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Returns Policy"
        subtitle="Simulated returns for a demo marketplace"
      />
      <div className={`${cardCls} mt-6 space-y-5 p-6 text-zinc-700 leading-relaxed`}>
        <p>
          <strong>30-day window.</strong> In this demo store, items are eligible for
          return within 30 days of the simulated delivery date, provided they are
          unused and in their original demo packaging.
        </p>
        <p>
          <strong>How it works.</strong> Because ZUVO ships no physical goods, a return
          is simulated as a refund to the original demo payment. Start a return from
          your order history (<Link href="/account/orders" className="font-semibold text-orange-600 hover:underline">Account → Orders</Link>)
          or mention your order number on the <Link href="/contact" className="font-semibold text-orange-600 hover:underline">contact form</Link>.
        </p>
        <p>
          <strong>Refunds.</strong> Approved demo refunds return the item total to the
          demo payment method used at checkout. Shipping fees are refunded only when
          the return reason is a demo fulfillment error. Rewards or promo discounts
          applied to the order are restored as demo credit, never as cash.
        </p>
        <p>
          <strong>Non-returnable.</strong> Final-sale demo items and digital demo goods
          are marked as such on the product page and cannot be returned.
        </p>
        <p>
          <strong>Important.</strong> This policy describes simulated behavior in a
          demonstration marketplace. No real products change hands and no real money
          is refunded — ever.
        </p>
      </div>
    </div>
  );
}
