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
        <div className={cardCls}>
          <h1 className="text-2xl font-bold text-zinc-900">Already claimed</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your {formatUSD(reward.amountCents)} welcome reward was already claimed on{" "}
            {fmtDate(reward.claimedAt)}. Each customer can claim the welcome reward once.
          </p>
          <Link href="/account/rewards" className={`${btnPrimary} mt-6 inline-flex w-full justify-center`}>
            View in your account
          </Link>
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
