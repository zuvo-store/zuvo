export const dynamic = "force-dynamic";
import { SectionTitle } from "@/components/ui";
import ContactForm from "./ContactForm";

export const metadata = { title: "Contact us — ZUVO" };

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <SectionTitle
        title="Contact us"
        subtitle="Questions about the demo marketplace? Send a message."
      />
      <div className="mt-6">
        <ContactForm />
      </div>
      <p className="mt-6 text-sm text-zinc-500">
        ZUVO is a demonstration marketplace. Messages are logged for the demo team;
        replies are not guaranteed. Please do not include passwords, card numbers,
        or other sensitive information.
      </p>
    </div>
  );
}
