import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** POST /api/admin/pricing/apply — apply an AI-suggested price. Admin only. */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { productId, price } = (await req.json().catch(() => ({}))) as {
      productId?: string; price?: number;
    };
    if (!productId || typeof price !== "number" || price <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }
    const product = await db.product.findUnique({ where: { id: productId }, select: { costCents: true } });
    if (!product) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const priceCents = Math.round(price * 100);
    if (priceCents < product.costCents) {
      return NextResponse.json({ ok: false, error: "Price cannot go below cost" }, { status: 400 });
    }
    await db.product.update({ where: { id: productId }, data: { priceCents } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
