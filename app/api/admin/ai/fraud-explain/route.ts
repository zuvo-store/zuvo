import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";
import { scoreRecentOrders } from "@/lib/fraud";

/**
 * POST /api/admin/ai/fraud-explain — AI plain-language fraud assessment.
 * Admin only. Body: { orderId: string }
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string };
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });
    const scored = await scoreRecentOrders(50);
    const order = scored.find((o) => o.id === orderId);
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    const text = await groqChat({
      system: `You are a fraud analyst briefing a store owner. Given the order's risk signals, write a 2-3 sentence plain-language assessment: how worried should they be, and what to do (e.g. verify by email, hold shipment, or it's fine). Be direct, no jargon.`,
      user: `Order ${order.orderNumber}: total $${(order.totalCents / 100).toFixed(2)}, status ${order.status}, payment ${order.paymentStatus}, customer ${order.customer} <${order.email}>. Risk level: ${order.level} (score ${order.score}/100). Flags: ${order.flags.map((f) => `${f.signal} (${f.detail})`).join("; ") || "none"}.`,
      maxTokens: 250,
      temperature: 0.4,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    return NextResponse.json({ ok: true, assessment: text });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
