export const dynamic = "force-dynamic";
import { SectionTitle, cardCls } from "@/components/ui";

export const metadata = { title: "Shipping Info — ZUVO" };

export default function ShippingPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Shipping Info"
        subtitle="Illustrative delivery options for the demo store"
      />
      <div className={`${cardCls} mt-6 space-y-5 p-6 text-zinc-700 leading-relaxed`}>
        <div>
          <h2 className="font-semibold text-zinc-900">Delivery methods</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex justify-between gap-4 border-b border-zinc-100 pb-2">
              <span><strong>Standard</strong> — 5–8 business days (illustrative)</span>
              <span className="font-semibold">$4.99</span>
            </li>
            <li className="flex justify-between gap-4">
              <span><strong>Express</strong> — 2–4 business days (illustrative)</span>
              <span className="font-semibold">$12.99</span>
            </li>
          </ul>
        </div>
        <p>
          <strong>Free standard shipping</strong> on all demo orders with a subtotal of
          $50 or more. Express shipping is always charged at the flat illustrative rate.
        </p>
        <p>
          <strong>Where we “ship”.</strong> ZUVO is a demonstration marketplace and no
          physical goods are shipped. Delivery estimates, tracking timelines, and
          shipping fees exist to simulate a realistic checkout experience.
        </p>
        <p>
          <strong>Order tracking.</strong> After a demo checkout you receive an order
          number (for example, ZV-20250101-ABC123). Use it with your checkout email on
          the <a href="/track-order" className="font-semibold text-orange-600 hover:underline">Track Order</a> page
          to follow the simulated journey from confirmation to delivery.
        </p>
        <p>
          <strong>Questions?</strong> See the <a href="/help" className="font-semibold text-orange-600 hover:underline">Help & FAQ</a> page
          or <a href="/contact" className="font-semibold text-orange-600 hover:underline">contact us</a>.
        </p>
      </div>
    </div>
  );
}
