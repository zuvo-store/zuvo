export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/search/suggest?q= — top 8 product name suggestions (min 2 chars).
 * Case-insensitive matching is done in JS (this Prisma/SQLite build has no
 * insensitive string filter mode).
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
    take: 60,
    select: { slug: true, name: true, brand: true, priceCents: true },
  });
  const suggestions = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand?.toLowerCase().includes(q) ?? false)
    )
    .slice(0, 8)
    .map((p) => ({ slug: p.slug, name: p.name, priceCents: p.priceCents }));
  return NextResponse.json({ ok: true, suggestions });
}
