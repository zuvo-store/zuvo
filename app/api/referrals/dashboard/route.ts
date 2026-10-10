export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getReferralDashboard } from "@/lib/referrals";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const dashboard = await getReferralDashboard(user.id);
  return NextResponse.json({ ok: true, ...dashboard });
}
