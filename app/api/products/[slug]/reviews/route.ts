export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** POST /api/products/:slug/reviews — {rating, title?, body?}. Requires login. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to write a review." }, { status: 401 });
  }
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, select: { id: true, active: true } });
  if (!product || !product.active) {
    return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
  }

  let body: { rating?: unknown; title?: unknown; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const rating = typeof body.rating === "number" ? Math.round(body.rating) : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  if (title.length > 120) {
    return NextResponse.json({ ok: false, error: "Title must be 120 characters or less." }, { status: 400 });
  }
  if (!reviewBody) {
    return NextResponse.json({ ok: false, error: "Please write a few words about the product." }, { status: 400 });
  }
  if (reviewBody.length > 2000) {
    return NextResponse.json({ ok: false, error: "Review must be 2000 characters or less." }, { status: 400 });
  }

  const review = await db.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        authorName: user.name,
        rating,
        title: title || null,
        body: reviewBody,
      },
    });
    const agg = await tx.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    });
    await tx.product.update({
      where: { id: product.id },
      data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count },
    });
    return created;
  });

  return NextResponse.json({
    ok: true,
    review: {
      id: review.id,
      authorName: review.authorName,
      rating: review.rating,
      title: review.title,
      body: review.body,
      createdAt: review.createdAt.toISOString(),
    },
  });
}
