export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRewardHistory } from "@/lib/rewards";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const history = await getRewardHistory(user.id);
  return NextResponse.json({ ok: true, history });
}
