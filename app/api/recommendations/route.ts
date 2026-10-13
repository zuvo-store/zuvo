import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { groqChat, extractIdList } from "@/lib/groq";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/recommendations — personalized "For You" picks.
 * Body: { slugs: string[] } (recently viewed, from localStorage).
 * Also blends in the signed-in user's wishlist/cart. Returns 8 products.
 */
export async function POST(req: NextRequest) {
  try {
    const { slugs } = (await req.json().catch(() => ({}))) as { slugs?: string[] };
    const recentSlugs = Array.isArray(slugs) ? slugs.filter((s) => typeof s === "string").slice(0, 8) : [];

    // Server-side taste signals for signed-in users.
    let extraSlugs: string[] = [];
    try {
      const me = await getSessionUser();
      if (me) {
        const [wishlist, cartItems, orders] = await Promise.all([
          db.wishlistItem.findMany({ where: { userId: me.id }, select: { product: { select: { slug: true } } }, take: 10 }),
          db.cartItem.findMany({ where: { userId: me.id }, select: { product: { select: { slug: true } } }, take: 10 }),
          db.order.findMany({ where: { userId: me.id, status: { not: "DRAFT" } }, select: { items: { select: { product: { select: { slug: true } } } } }, take: 3 }),
        ]);
        extraSlugs = [
          ...wishlist.map((w) => w.product.slug),
          ...cartItems.map((c) => c.product.slug),
          ...orders.flatMap((o) => o.items.map((i) => i.product?.slug).filter((s): s is string => !!s)),
        ];
      }
    } catch {
      /* taste signals optional */
    }

    const tasteSlugs = [...new Set([...recentSlugs, ...extraSlugs])].slice(0, 12);
    if (tasteSlugs.length === 0) {
      // No signals: fall back to popular products.
      const popular = await db.product.findMany({
        where: { active: true },
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 8,
        select: { id: true, slug: true, name: true, priceCents: true, originalPriceCents: true, images: true, rating: true },
      });
      return NextResponse.json({ ok: true, items: popular, personalized: false });
    }

    const [tasteProducts, catalog] = await Promise.all([
      db.product.findMany({
        where: { slug: { in: tasteSlugs } },
        select: { id: true, name: true, brand: true, category: { select: { name: true } } },
      }),
      db.product.findMany({
        where: { active: true, slug: { notIn: tasteSlugs } },
        select: { id: true, name: true, brand: true, description: true, priceCents: true, category: { select: { name: true } } },
        take: 120,
      }),
    ]);
    if (catalog.length === 0) return NextResponse.json({ ok: true, items: [], personalized: true });

    const tasteDesc = tasteProducts.map((p) => `${p.name}${p.brand ? ` (${p.brand})` : ""}${p.category ? ` [${p.category.name}]` : ""}`).join("; ");
    const list = catalog
      .map((p) => `${p.id} :: ${p.name}${p.brand ? ` (${p.brand})` : ""}${p.category ? ` [${p.category.name}]` : ""} — $${(p.priceCents / 100).toFixed(2)}`)
      .join("\n");

    const text = await groqChat({
      system: `You are a shopping recommender. The customer is interested in: ${tasteDesc}. From the catalog below (format: ID :: name — price), pick the 8 products they would most likely love next. Prefer similar categories, complementary items, and good value. Return ONLY a JSON array of product IDs, no other text.`,
      user: `Catalog:\n${list}`,
      maxTokens: 400,
      temperature: 0.5,
    });
    const ids = extractIdList(text);
    const valid = new Set(catalog.map((p) => p.id));
    const picked = ids.filter((id) => valid.has(id)).slice(0, 8);

    // Fallback: top-rated if AI failed.
    const finalIds = picked.length > 0 ? picked : catalog.slice(0, 8).map((p) => p.id);
    const items = await db.product.findMany({
      where: { id: { in: finalIds } },
      select: { id: true, slug: true, name: true, priceCents: true, originalPriceCents: true, images: true, rating: true },
    });
    const byId = new Map(items.map((p) => [p.id, p]));
    const ordered = finalIds.map((id) => byId.get(id)).filter((p) => !!p);

    return NextResponse.json({ ok: true, items: ordered, personalized: true });
  } catch {
    return NextResponse.json({ ok: false, items: [] });
  }
}
