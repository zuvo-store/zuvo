export const dynamic = "force-dynamic";
import Link from "next/link";
import { SectionTitle } from "@/components/ui";
import TrackOrderForm from "./TrackOrderForm";

export const metadata = { title: "Track your order — ZUVO" };

export default function TrackOrderPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Track your order"
        subtitle="Enter your order number and the email you used at checkout"
      />
      <div className="mt-6">
        <TrackOrderForm />
      </div>
      <p className="mt-6 text-sm text-zinc-500">
        Signed in and ordered with your account?{" "}
        <Link href="/account/orders" className="font-semibold text-orange-600 hover:underline">
          View your orders
        </Link>
        .
      </p>
    </div>
  );
}
