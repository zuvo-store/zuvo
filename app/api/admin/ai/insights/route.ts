import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";
import { getBusinessSnapshot } from "@/lib/business-snapshot";

async function requireAdmin() {
  const me = await getSessionUser();
  return me && me.role === "ADMIN" ? me : null;
}

const BRIEFING_PROMPT = `You are a sharp e-commerce business analyst briefing the OWNER of ZUVO, an online marketplace. Given the business snapshot below, write a comprehensive "where my business stands right now" briefing.

RULES:
- Write in clear, professional English (the owner reads English for business).
- Follow this EXACT sequence of sections with these headings:
  1. 🩺 Business Health — one-paragraph verdict: thriving, stable, or needs attention, with the key numbers.
  2. 📈 Revenue & Growth — 30-day revenue, change vs previous 30 days, what the trend means.
  3. 🏆 What's Working — top products and strengths to double down on.
  4. ⚠️ Needs Attention — weak spots: dead stock, low stock, refunds, pending orders, declining metrics.
  5. 👥 Customers — new customer trend and what it implies.
  6. 🎯 Recommended Actions — 3-5 concrete next steps, most impactful first.
- Be specific with numbers from the snapshot. No fluff, no generic advice.
- Keep the whole briefing under 350 words.
- If revenue is $0, say plainly the store has no sales yet and focus the briefing on what to do first (traffic, products, offers).`;

/**
 * POST /api/admin/ai/insights — full AI business briefing. Admin only.
 */
export async function POST(_req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const snap = await getBusinessSnapshot();
    const text = await groqChat({
      system: BRIEFING_PROMPT,
      user: `Business snapshot (last 30 days vs prior 30 days):\n${JSON.stringify(snap, null, 1)}`,
      maxTokens: 1200,
      temperature: 0.4,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    return NextResponse.json({ ok: true, briefing: text, snapshot: snap });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
