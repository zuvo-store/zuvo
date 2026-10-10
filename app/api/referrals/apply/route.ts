export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { attributeReferral } from "@/lib/referrals";
import { readJson } from "../../_helpers";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });

  const body = await readJson(req);
  const code = String(body?.code ?? "");

  const existing = await db.referralAttribution.findUnique({ where: { referredId: user.id } });
  if (existing)
    return NextResponse.json(
      { ok: false, error: "This account already has a referral attribution." },
      { status: 409 }
    );

  const result = await attributeReferral(user.id, code);
  if (result.ok === false)
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
