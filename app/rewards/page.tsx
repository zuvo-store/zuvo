export const dynamic = "force-dynamic";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getActiveSignupCampaign, ensureRewardForUser, getRewardHistory } from "@/lib/rewards";
import { formatUSD } from "@/lib/money";
import { btnPrimary, cardCls, cardFlushCls, Badge } from "@/components/ui";
import EmptyState from "@/components/EmptyState";

export const metadata = { title: "Rewards — ZUVO" };

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US");
}

export default async function RewardsPage() {
  const [campaign, user] = await Promise.all([getActiveSignupCampaign(), getSessionUser()]);
  const reward = user && campaign ? await ensureRewardForUser(user.id) : null;
  const history = user ? await getRewardHistory(user.id) : [];

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <EmptyState
          title="No reward campaign right now"
          message="There is no active signup reward campaign at the moment. Check back soon."
          actionHref="/"
          actionLabel="Continue shopping"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* Promo card */}
      <section className={`${cardFlushCls} overflow-hidden`}>
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-8 text-white">
          <Badge>{campaign.label}</Badge>
          <h1 className="mt-3 text-3xl font-bold">
            {formatUSD(campaign.amountCents)} {campaign.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/90">
            New here? ZUVO runs simulated welcome rewards for new customers. This is a
            demonstration: the amount is display-only and has no real monetary value — nothing is
            paid out, charged, or withdrawable.
          </p>
        </div>

        <div className="px-6 py-6">
          <h2 className="text-lg font-semibold text-zinc-900">Your reward status</h2>
          {!user ? (
            <div className="mt-3 rounded-xl bg-zinc-50 p-4">
              <p className="text-sm text-zinc-600">
                Sign in to see your personal reward status and claim it.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/auth/login?next=/rewards" className={btnPrimary}>
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Create an account
                </Link>
              </div>
            </div>
          ) : !reward ? (
            <p className="mt-3 text-sm text-zinc-600">No reward record found for your account.</p>
          ) : reward.status === "AVAILABLE" ? (
            <div className="mt-3 rounded-xl bg-brand-50 p-4">
              <p className="text-sm font-medium text-zinc-800">
                Good news — your {formatUSD(reward.amountCents)} welcome reward is available.
              </p>
              <Link href="/rewards/claim" className={`${btnPrimary} mt-3 inline-flex`}>
                Claim your reward
              </Link>
            </div>
          ) : reward.status === "CLAIMED" ? (
            <div className="mt-3 rounded-xl bg-zinc-50 p-4">
              <p className="text-sm text-zinc-700">
                Claimed on {fmtDate(reward.claimedAt)}.{" "}
                <Link href="/account/rewards" className="font-medium text-brand-700 underline">
                  View it in your account
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-zinc-50 p-4">
              <p className="text-sm text-zinc-700">
                Status: <span className="font-semibold">{reward.status}</span>
                {reward.status === "PENDING" && " — your claim is being reviewed."}
                {reward.status === "EXPIRED" && " — this reward is no longer available."}
                {reward.status === "REJECTED" && " — this claim was not accepted."}
                {reward.status === "REVERSED" && " — this reward was reversed."}
              </p>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-900">How it works</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
              <li>Create a ZUVO account — a reward record is enrolled automatically.</li>
              <li>Claim it with your name, email, and country on the claim page.</li>
              <li>One reward per customer for the active campaign.</li>
              <li>Simulated only: no cash value, no withdrawals, nothing is ever charged.</li>
            </ul>
            <Link href="/rewards/terms" className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
              Read the full reward terms
            </Link>
          </div>
        </div>
      </section>

      {/* History */}
      {user && history.length > 0 && (
        <section className={`${cardCls} mt-6`}>
          <h2 className="text-lg font-semibold text-zinc-900">Reward history</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Campaign</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-zinc-800">{r.campaign.name}</td>
                    <td className="py-2 pr-4">{formatUSD(r.amountCents)}</td>
                    <td className="py-2 pr-4">
                      <Badge>{r.status}</Badge>
                    </td>
                    <td className="py-2 text-zinc-500">{fmtDate(r.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Referral teaser */}
      <section className={`${cardCls} mt-6`}>
        <h2 className="text-lg font-semibold text-zinc-900">Invite friends, track referrals</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Every account gets a personal referral link. Share it and watch visits and signups on
          your referral dashboard.
        </p>
        <Link
          href={user ? "/account/referrals" : "/auth/signup"}
          className={`${btnPrimary} mt-4 inline-flex`}
        >
          {user ? "Open my referral dashboard" : "Create an account to get your link"}
        </Link>
      </section>
    </div>
  );
}
