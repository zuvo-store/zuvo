export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productAttributes, productImages } from "@/app/_shop/query";

/** GET /api/products/:slug — single product with category, variants, latest 10 reviews. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { value: "asc" }] },
      reviews: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!product || !product.active) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      shortDesc: product.shortDesc,
      description: product.description,
      priceCents: product.priceCents,
      originalPriceCents: product.originalPriceCents,
      currency: product.currency,
      stock: product.stock,
      sku: product.sku,
      rating: product.rating,
      reviewCount: product.reviewCount,
      images: productImages(product.images),
      attributes: productAttributes(product.attributes),
      featured: product.featured,
      deal: product.deal,
      category: product.category,
      variants: product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        value: v.value,
        priceDeltaCents: v.priceDeltaCents,
        stock: v.stock,
        sku: v.sku,
      })),
      reviews: product.reviews.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      })),
    },
  });
}
