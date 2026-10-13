import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";
import { getBusinessSnapshot } from "@/lib/business-snapshot";

/**
 * POST /api/admin/ai/insights/ask — follow-up Q&A about the business.
 * Body: { question: string }. Admin only.
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { question } = (await req.json().catch(() => ({}))) as { question?: string };
    if (!question || !question.trim() || question.length > 300) {
      return NextResponse.json({ ok: false, error: "Ask a question (max 300 chars)" }, { status: 400 });
    }
    const snap = await getBusinessSnapshot();
    const text = await groqChat({
      system: `You are the business analyst for ZUVO's owner. Answer their question using ONLY the business snapshot below. Be specific with numbers, concise (under 120 words), professional. If the snapshot lacks the data to answer, say so plainly and suggest where to look. Never invent numbers.`,
      user: `Snapshot:\n${JSON.stringify(snap)}\n\nOwner's question: ${question.trim()}`,
      maxTokens: 400,
      temperature: 0.4,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    return NextResponse.json({ ok: true, answer: text });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
