export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserReward } from "@/lib/rewards";
import { formatUSD } from "@/lib/money";
import EmptyState from "@/components/EmptyState";
import { cardCls, btn } from "@/components/ui";

const STATUS_TONE: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  PENDING: "bg-amber-100 text-amber-800",
  CLAIMED: "bg-blue-100 text-blue-800",
  EXPIRED: "bg-zinc-200 text-zinc-700",
  REJECTED: "bg-red-100 text-red-700",
  REVERSED: "bg-red-100 text-red-700",
};

export default async function RewardsPage() {
  const user = await requireUser();
  const reward = await getUserReward(user.id);

  if (!reward) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          title="No reward campaign right now"
          message="There is no active signup reward campaign at the moment. Check back later."
          actionHref="/account/referrals"
          actionLabel="Invite friends instead"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Rewards</h1>

      <section className={`${cardCls} mb-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">{reward.campaign.name}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900">{formatUSD(reward.amountCents)}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {reward.campaign.label}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              STATUS_TONE[reward.status] ?? "bg-zinc-100 text-zinc-700"
            }`}
          >
            {reward.status}
          </span>
        </div>
        {reward.claimedAt && (
          <p className="mt-3 text-sm text-zinc-500">
            Claimed on {new Date(reward.claimedAt).toLocaleString("en-US")}
          </p>
        )}
        {reward.status === "AVAILABLE" && (
          <div className="mt-4">
            <Link href="/rewards/claim" className={btn}>
              Claim your reward
            </Link>
            <p className="mt-2 text-xs text-zinc-500">
              Demo reward — no cash value. See the{" "}
              <Link href="/rewards/terms" className="font-medium text-orange-600 hover:text-orange-700">
                reward terms
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      {reward.events.length > 0 && (
        <section className={`${cardCls} mb-6`}>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Reward history</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Change</th>
                  <th className="pb-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {reward.events.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4 text-zinc-600">
                      {new Date(e.createdAt).toLocaleString("en-US")}
                    </td>
                    <td className="py-2 pr-4 text-zinc-900">
                      {e.fromStatus} → {e.toStatus}
                    </td>
                    <td className="py-2 text-zinc-600">{e.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={cardCls}>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900">Earn more with referrals</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Share your personal referral link and earn credit when friends join ZUVO.
        </p>
        <Link
          href="/account/referrals"
          className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Go to referrals
        </Link>
      </section>
    </main>
  );
}
