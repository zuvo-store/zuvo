import { db } from "@/lib/db";
import type { Prisma, Product } from "@prisma/client";

/**
 * Shared product listing query helpers for the SHOP routes.
 * Money is always integer cents; callers convert dollar params via dollarsToCentsParam.
 */

export type ProductFilters = {
  q?: string;
  categorySlug?: string;
  minCents?: number;
  maxCents?: number;
  sort?: string;
  sale?: boolean;
  inStock?: boolean;
  deal?: boolean;
  featured?: boolean;
  activeOnly?: boolean;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  originalPriceCents: number | null;
  images: string[];
  rating: number;
  reviewCount: number;
  stock: number;
};

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Recommended" },
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function toListItem(p: Product): ProductListItem {
  const images = Array.isArray(p.images)
    ? p.images.filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    originalPriceCents: p.originalPriceCents,
    images,
    rating: p.rating,
    reviewCount: p.reviewCount,
    stock: p.stock,
  };
}

export function productImages(images: unknown): string[] {
  return Array.isArray(images)
    ? images.filter((x): x is string => typeof x === "string")
    : [];
}

export function productAttributes(attributes: unknown): Record<string, string> {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attributes as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number") out[k] = String(v);
  }
  return out;
}

export function dollarsToCentsParam(v: string | null | undefined): number | undefined {
  if (v == null || v === "") return undefined;
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

export function buildWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (f.activeOnly !== false) where.active = true;
  if (f.deal) where.deal = true;
  if (f.featured) where.featured = true;
  if (f.inStock) where.stock = { gt: 0 };
  if (f.categorySlug) where.category = { slug: f.categorySlug, active: true };
  if (f.sale) where.originalPriceCents = { not: null };
  const priceFilter: Prisma.IntFilter = {};
  let hasPrice = false;
  if (typeof f.minCents === "number" && Number.isFinite(f.minCents)) {
    priceFilter.gte = f.minCents;
    hasPrice = true;
  }
  if (typeof f.maxCents === "number" && Number.isFinite(f.maxCents)) {
    priceFilter.lte = f.maxCents;
    hasPrice = true;
  }
  if (hasPrice) where.priceCents = priceFilter;
  // NOTE: free-text `q` is NOT applied here. This Prisma/SQLite build does not
  // support case-insensitive string filters, so `queryProducts` applies the
  // query as a case-insensitive substring match in JS instead.
  return where;
}

export function buildOrderBy(
  sort?: string
): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return { priceCents: "asc" };
    case "price-desc":
      return { priceCents: "desc" };
    case "newest":
      return { createdAt: "desc" };
    case "popular":
      return [{ reviewCount: "desc" }, { rating: "desc" }];
    default:
      return [{ featured: "desc" }, { rating: "desc" }];
  }
}

export type ProductQueryResult = {
  items: ProductListItem[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
};

function matchesQuery(
  p: { name: string; description: string | null; brand: string | null },
  q: string
): boolean {
  return (
    p.name.toLowerCase().includes(q) ||
    (p.description?.toLowerCase().includes(q) ?? false) ||
    (p.brand?.toLowerCase().includes(q) ?? false)
  );
}

function paginate(
  items: ProductListItem[],
  page: number,
  perPage: number
): ProductQueryResult {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    total,
    totalPages,
    page: safePage,
    perPage,
  };
}

export async function queryProducts(
  filters: ProductFilters,
  page: number,
  perPage: number
): Promise<ProductQueryResult> {
  const safePerPage = Math.min(48, Math.max(1, Math.floor(perPage) || 24));
  const where = buildWhere(filters);
  const orderBy = buildOrderBy(filters.sort);
  const q = filters.q?.trim().toLowerCase();

  if (q || filters.sale) {
    // JS-filtered path: case-insensitive text match (unsupported natively by
    // this Prisma/SQLite build) and field-to-field sale comparison
    // (originalPriceCents > priceCents) both need post-processing.
    // Demo catalogs are small; the scan is capped.
    const all = await db.product.findMany({ where, orderBy, take: 2000 });
    let rows = all;
    if (q) rows = rows.filter((p) => matchesQuery(p, q));
    if (filters.sale)
      rows = rows.filter(
        (p) => p.originalPriceCents != null && p.originalPriceCents > p.priceCents
      );
    return paginate(rows.map(toListItem), page, safePerPage);
  }

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (Math.max(1, page) - 1) * safePerPage,
      take: safePerPage,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: page > totalPages ? [] : rows.map(toListItem),
    total,
    totalPages,
    page: safePage,
    perPage: safePerPage,
  };
}
