import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";

/**
 * POST /api/admin/ai/cart-message — AI win-back message for an abandoned cart.
 * Admin only. Body: { customerName?, items: string[], total: number }
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { customerName, items, total } = (await req.json().catch(() => ({}))) as {
      customerName?: string; items?: string[]; total?: number;
    };
    if (!items || items.length === 0) {
      return NextResponse.json({ ok: false, error: "No items" }, { status: 400 });
    }
    const text = await groqChat({
      system: `You write abandoned-cart win-back emails for ZUVO marketplace. Write a short, warm, personal email (subject line + 3-4 sentence body). Mention the items by name, create gentle urgency (stock/price), offer no discount unless asked. Friendly tone, one emoji max. Return ONLY the email as:\nSubject: ...\n\nBody text...`,
      user: `Customer: ${customerName || "valued customer"}\nCart items: ${items.join(", ")}\nCart total: $${(total ?? 0).toFixed(2)}`,
      maxTokens: 300,
      temperature: 0.7,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    return NextResponse.json({ ok: true, message: text });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
