export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { recordReferralVisit } from "@/lib/referrals";
import { readJson } from "../../_helpers";

/** Records a referral-link landing visit. Fire-and-forget: never fails. */
export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    await recordReferralVisit(String(body?.code ?? ""));
  } catch {
    // Never fail — a visit is only analytics.
  }
  return NextResponse.json({ ok: true });
}
