export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureRewardForUser } from "@/lib/rewards";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const reward = await ensureRewardForUser(user.id);
  if (!reward) return NextResponse.json({ ok: true, reward: null });

  return NextResponse.json({
    ok: true,
    reward: {
      status: reward.status,
      amountCents: reward.amountCents,
      claimedAt: reward.claimedAt,
      campaign: { name: reward.campaign.name, label: reward.campaign.label },
    },
  });
}
