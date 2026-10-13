import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/admin/marketing/products?q= — product picker. Admin only. */
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { rating: "desc" },
    take: 100,
    select: { id: true, name: true, priceCents: true, shortDesc: true, images: true },
  });
  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 12)
    : products.slice(0, 12);
  return NextResponse.json({ ok: true, products: filtered });
}
