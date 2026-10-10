export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") return images[0];
  return null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({
    ok: true,
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      createdAt: i.createdAt,
      product: {
        id: i.product.id,
        name: i.product.name,
        slug: i.product.slug,
        priceCents: i.product.priceCents,
        originalPriceCents: i.product.originalPriceCents,
        image: firstImage(i.product.images),
        rating: i.product.rating,
        reviewCount: i.product.reviewCount,
        active: i.product.active,
      },
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { productId?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return Response.json({ ok: false, error: "productId is required." }, { status: 400 });
  }
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    return Response.json({ ok: false, error: "This product is not available." }, { status: 404 });
  }
  await db.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId },
    update: {},
  });
  return Response.json({ ok: true, active: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { productId?: unknown } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return Response.json({ ok: false, error: "productId is required." }, { status: 400 });
  }
  await db.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
  return Response.json({ ok: true, active: false });
}
