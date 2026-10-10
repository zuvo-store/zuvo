export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { claimReward } from "@/lib/rewards";
import { readJson } from "../../_helpers";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const body = await readJson(req);
  const fullName = String(body?.fullName ?? "");
  const email = String(body?.email ?? "");
  const country = String(body?.country ?? "");
  const phone = body?.phone ? String(body.phone) : undefined;

  try {
    const reward = await claimReward(user.id, { fullName, email, country, phone });
    return NextResponse.json({ ok: true, reward });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not claim the reward.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
