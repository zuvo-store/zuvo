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
      system: `You are a pricing strategist for an online marketplace. For each product, suggest a new price in USD and a one-line reason. Consider: margin (aim 25-40%), stock levels (high stock + no sales → lower price to move it; low margin → raise slightly), ratings (high-rated can charge more). Never suggest below cost. Reply with ONE line per product in EXACTLY this format, nothing else:
<product id> | <suggested price like 12.99> | <reason under 15 words>`,
      user: candidates.map((c) =>
        `ID: ${c.id}\nName: ${c.name} (${c.category})\nPrice: $${c.price}, Cost: $${c.cost}, Margin: ${c.marginPct}%, Stock: ${c.stock}, Rating: ${c.rating}, Sold/30d: ${c.sold30d}`
      ).join("\n---\n"),
      maxTokens: 1500,
      temperature: 0.4,
      retries: 2,
    });
    if (!text) return NextResponse.json({ ok: false, error: "AI unavailable" }, { status: 502 });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const suggestions: { id: string; suggestedPrice: number; reason: string }[] = [];
    for (const line of text.split("\n")) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 3) continue;
      const [id, priceStr, ...reasonParts] = parts;
      const suggestedPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
      const reason = reasonParts.join(" | ").trim();
      if (byId.has(id) && !isNaN(suggestedPrice) && suggestedPrice > 0 && reason) {
        suggestions.push({ id, suggestedPrice, reason });
      }
    }
    if (suggestions.length === 0) {
      return NextResponse.json({ ok: false, error: "AI returned invalid format" }, { status: 502 });
    }
    const enriched = suggestions.map((s) => ({ ...s, ...byId.get(s.id)! }));
    return NextResponse.json({ ok: true, suggestions: enriched });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
