import { NextResponse } from "next/server";
import { queryProducts, type ProductFilters } from "@/app/_shop/query";

/**
 * GET /api/products/list?q=&categorySlug=&deal=&sort=&page=&perPage=
 * Powers infinite scroll on shop listing pages.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const filters: ProductFilters = { activeOnly: true };
  const q = sp.get("q");
  const categorySlug = sp.get("categorySlug");
  const sort = sp.get("sort");
  if (q) filters.q = q;
  if (categorySlug) filters.categorySlug = categorySlug;
  if (sort) filters.sort = sort;
  if (sp.get("deal") === "1") filters.deal = true;
  const minCents = parseInt(sp.get("minCents") ?? "", 10);
  const maxCents = parseInt(sp.get("maxCents") ?? "", 10);
  if (!isNaN(minCents)) filters.minCents = minCents;
  if (!isNaN(maxCents)) filters.maxCents = maxCents;

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(48, Math.max(1, parseInt(sp.get("perPage") ?? "24", 10) || 24));

  try {
    const result = await queryProducts(filters, page, perPage);
    return NextResponse.json({
      ok: true,
      items: result.items,
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
      hasMore: result.page < result.totalPages,
    });
  } catch (e) {
    console.error("products/list error", e);
    return NextResponse.json({ ok: false, error: "Could not load products." }, { status: 500 });
  }
}
