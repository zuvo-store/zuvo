import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { groqChat } from "@/lib/groq";

/**
 * GET /api/admin/ai/pricing — AI price suggestions (admin only).
 * Analyzes margin, stock, and 30-day sales velocity, then asks AI for
 * specific price moves with reasons. Returns JSON suggestions.
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const products = await db.product.findMany({
      where: { active: true },
      select: {
        id: true, name: true, priceCents: true, costCents: true, stock: true,
        rating: true, category: { select: { name: true } },
      },
      take: 100,
    });
    const sales = await db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: { notIn: ["DRAFT", "CANCELLED"] }, createdAt: { gte: d30 } } },
      _sum: { qty: true },
    });
    const salesById = new Map(sales.map((s) => [s.productId, s._sum.qty ?? 0]));

    const rows = products.map((p) => {
      const price = p.priceCents / 100;
      const cost = p.costCents / 100;
      const marginPct = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
      return {
        id: p.id, name: p.name, category: p.category.name,
        price, cost, marginPct, stock: p.stock, rating: p.rating,
        sold30d: salesById.get(p.id) ?? 0,
      };
    });

    // Shortlist products worth repricing: thin margin, dead stock, or overstocked slow movers
    const candidates = rows.filter(
      (r) => (r.marginPct < 15 && r.cost > 0) || (r.sold30d === 0 && r.stock > 10) || (r.stock > 50 && r.sold30d < 3)
    ).slice(0, 20);

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, suggestions: [], note: "All prices look healthy — no changes suggested." });
    }

    const text = await groqChat({
      system: `You are a pricing strategist for an online marketplace. For each product below, suggest a new price in USD and a one-line reason. Consider: margin (aim 25-40%), stock levels (high stock + no sales → lower price to move it; low margin → raise slightly), ratings (high-rated can charge more). Return ONLY valid JSON in this exact shape: {"suggestions":[{"id":"...","suggestedPrice":12.99,"reason":"..."}]}. Keep reasons under 15 words. Never suggest below cost.`,
      user: JSON.stringify(candidates.map((c) => ({
        id: c.id, name: c.name, category: c.category, price: c.price, cost: c.cost,
        marginPct: c.marginPct, stock: c.stock, rating: c.rating, sold30d: c.sold30d,
      }))),
      maxTokens: 1500,
      temperature: 0.4,
      jsonMode: true,
      retries: 1,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    let parsed: { suggestions?: { id: string; suggestedPrice: number; reason: string }[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) return NextResponse.json({ ok: false, error: "AI returned invalid format" }, { status: 502 });
      parsed = { suggestions: JSON.parse(m[0]) };
    }
    const suggestions = parsed.suggestions ?? [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const enriched = suggestions
      .filter((s) => byId.has(s.id) && typeof s.suggestedPrice === "number")
      .map((s) => ({ ...s, ...byId.get(s.id)! }));
    return NextResponse.json({ ok: true, suggestions: enriched });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
