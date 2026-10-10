export const dynamic = "force-dynamic";
import { cardCls } from "@/components/ui";
import TermsAck from "./TermsAck";

export const metadata = { title: "Reward terms — ZUVO" };

const TERMS: { title: string; body: string }[] = [
  {
    title: "1. Demonstration only",
    body: "ZUVO is a demo marketplace. The rewards program is a simulated feature built to demonstrate how a real rewards flow works — accounts, campaigns, claims, and history.",
  },
  {
    title: "2. No cash value",
    body: "Every reward amount shown (for example, the welcome reward) is display-only. It is not money, credit, or a gift card, and it cannot be spent, transferred, or converted into anything of value.",
  },
  {
    title: "3. No withdrawals or payouts",
    body: "Rewards cannot be withdrawn to a bank account, wallet, or any payment method. No payout is ever made, in whole or in part.",
  },
  {
    title: "4. One reward per customer",
    body: "Each customer account can be enrolled in the active signup campaign once and can claim the welcome reward only once. Duplicate accounts created to claim multiple rewards may have their rewards rejected.",
  },
  {
    title: "5. Honest claim details",
    body: "Claiming requires your real full name, a valid email address, and your country. Claims with false, incomplete, or someone else's details can be rejected.",
  },
  {
    title: "6. Rejection rules",
    body: "A claim may be rejected if the details are invalid, the account appears to be a duplicate, the campaign has ended, or the reward status no longer allows claiming. Rejected rewards carry no value and no appeal payout.",
  },
  {
    title: "7. Referral tracking is illustrative",
    body: "Referral links, visit counts, and attributions are tracked to demonstrate a referral program. They confer no earnings, bonuses, or monetary benefit.",
  },
  {
    title: "8. Never share sensitive financial information",
    body: "Claiming a reward never requires bank details, card numbers, or payment credentials. ZUVO will never ask for them in a rewards flow — anyone who does is not acting for ZUVO.",
  },
  {
    title: "9. Simulations charge nothing",
    body: "Claiming, enrolling, or viewing rewards never charges you. No payment method is collected and no transaction is processed as part of the rewards program.",
  },
  {
    title: "10. Campaigns can change; your details stay private",
    body: "Administrators may pause, end, or replace reward campaigns at any time, which can change or remove reward availability. Claim details are stored with your account and used only to operate this demo feature.",
  },
];

export default function RewardTermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className={cardCls}>
        <h1 className="text-2xl font-bold text-zinc-900">Reward terms</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Plain-language terms for the ZUVO simulated rewards program. Last updated October 2026.
        </p>

        <ol className="mt-6 space-y-5">
          {TERMS.map((t) => (
            <li key={t.title}>
              <h2 className="text-base font-semibold text-zinc-900">{t.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{t.body}</p>
            </li>
          ))}
        </ol>

        <TermsAck />
      </div>
    </div>
  );
}
