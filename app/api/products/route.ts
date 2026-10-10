export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { dollarsToCentsParam, queryProducts } from "@/app/_shop/query";

/**
 * GET /api/products?q=&category=<slug>&minPrice=&maxPrice=&sort=&sale=1&inStock=1&page=&perPage=
 * Prices in query params are dollars; payload prices are integer cents.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const perPageRaw = parseInt(sp.get("perPage") ?? "24", 10) || 24;
  const perPage = Math.min(48, Math.max(1, perPageRaw));

  const result = await queryProducts(
    {
      q: sp.get("q") ?? undefined,
      categorySlug: sp.get("category") ?? undefined,
      minCents: dollarsToCentsParam(sp.get("minPrice")),
      maxCents: dollarsToCentsParam(sp.get("maxPrice")),
      sort: sp.get("sort") ?? undefined,
      sale: sp.get("sale") === "1",
      inStock: sp.get("inStock") === "1",
    },
    page,
    perPage
  );

  return NextResponse.json({
    ok: true,
    products: result.items,
    page: result.page,
    totalPages: result.totalPages,
    total: result.total,
  });
}
