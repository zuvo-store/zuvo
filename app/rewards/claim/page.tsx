export const dynamic = "force-dynamic";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ensureRewardForUser } from "@/lib/rewards";
import { formatUSD } from "@/lib/money";
import { btnPrimary, cardCls } from "@/components/ui";
import EmptyState from "@/components/EmptyState";
import ClaimForm from "./ClaimForm";

export const metadata = { title: "Claim reward — ZUVO" };

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleString("en-US") : "—";
}

export default async function ClaimPage() {
  const user = await requireUser("/rewards/claim");
  const reward = await ensureRewardForUser(user.id);

  if (!reward) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <EmptyState
          title="No reward campaign right now"
          message="There is no active signup reward campaign at the moment. Check back soon."
          actionHref="/rewards"
          actionLabel="Back to rewards"
        />
      </div>
    );
  }

  if (reward.status === "CLAIMED") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-6 text-center text-white">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-green-100">Claimed</p>
            <p className="mt-1 text-4xl font-extrabold">{formatUSD(reward.amountCents)}</p>
            <p className="mt-1 text-sm text-green-100">
              Claimed on {fmtDate(reward.claimedAt)} · added to your credit balance
            </p>
          </div>
          <div className="border-t-2 border-dashed border-green-200 bg-white px-6 py-4">
            <p className="text-center text-sm text-zinc-600">
              Each customer can claim the welcome reward once.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/account" className={`${btnPrimary} inline-flex flex-1 justify-center`}>
                View wallet
              </Link>
              <Link href="/deals" className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
                Shop deals
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (reward.status !== "AVAILABLE") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <div className={cardCls}>
          <h1 className="text-2xl font-bold text-zinc-900">Reward not claimable</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your reward is currently <span className="font-semibold">{reward.status}</span> and
            cannot be claimed right now.
            {reward.status === "PENDING" && " It is being reviewed — please check back later."}
            {reward.status === "EXPIRED" && " The campaign has ended."}
            {reward.status === "REJECTED" && " The claim was not accepted."}
            {reward.status === "REVERSED" && " The reward was reversed."}
          </p>
          <Link href="/rewards" className={`${btnPrimary} mt-6 inline-flex w-full justify-center`}>
            Back to rewards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <ClaimForm
        defaultName={user.name}
        defaultEmail={user.email}
        amountCents={reward.amountCents}
      />
    </div>
  );
}
