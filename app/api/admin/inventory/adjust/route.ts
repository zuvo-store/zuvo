import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyBackInStock } from "@/lib/stock-alerts";

/**
 * POST /api/admin/inventory/adjust
 * Body: { productId, variantId?, type, qty, reason? }
 * Types: PURCHASE (+), RETURN (+), DAMAGE (−), MISSING (−), ADJUSTMENT (±set)
 * Records a StockMovement and updates product/variant stock.
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { productId, variantId, type, qty, reason } = (await req.json().catch(() => ({}))) as {
      productId?: string; variantId?: string; type?: string; qty?: number; reason?: string;
    };
    const validTypes = ["PURCHASE", "RETURN", "DAMAGE", "MISSING", "ADJUSTMENT"];
    if (!productId || !validTypes.includes(type ?? "")) {
      return NextResponse.json({ ok: false, error: "Invalid product or type" }, { status: 400 });
    }
    const q = Math.trunc(Number(qty));
    if (!Number.isFinite(q) || q <= 0 || q > 100000) {
      return NextResponse.json({ ok: false, error: "Quantity must be 1–100000" }, { status: 400 });
    }
    const cleanReason = (reason ?? "").trim().slice(0, 300);

    // Signed qty: PURCHASE/RETURN add stock, DAMAGE/MISSING remove, ADJUSTMENT handled below
    const signed = type === "DAMAGE" || type === "MISSING" ? -q : q;

    const result = await db.$transaction(async (tx) => {
      if (variantId) {
        const v = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { id: true, stock: true, productId: true },
        });
        if (!v || v.productId !== productId) throw new Error("Variant not found");
        let newStock: number;
        let moveQty: number;
        if (type === "ADJUSTMENT") {
          moveQty = q - v.stock; // set to absolute value
          newStock = q;
        } else {
          moveQty = signed;
          newStock = Math.max(0, v.stock + signed);
        }
        await tx.productVariant.update({ where: { id: v.id }, data: { stock: newStock } });
        // Roll up to product total
        const sibs = await tx.productVariant.findMany({ where: { productId }, select: { id: true, stock: true } });
        const total = sibs.reduce((s, x) => s + (x.id === v.id ? newStock : x.stock), 0);
        await tx.product.update({ where: { id: productId }, data: { stock: total } });
        await tx.stockMovement.create({
          data: { productId, variantId: v.id, type: type!, qty: moveQty, reason: cleanReason, createdBy: me.id },
        });
        return { from: v.stock, to: newStock };
      } else {
        const p = await tx.product.findUnique({
          where: { id: productId },
          select: { id: true, stock: true },
        });
        if (!p) throw new Error("Product not found");
        let newStock: number;
        let moveQty: number;
        if (type === "ADJUSTMENT") {
          moveQty = q - p.stock;
          newStock = q;
        } else {
          moveQty = signed;
          newStock = Math.max(0, p.stock + signed);
        }
        await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
        await tx.stockMovement.create({
          data: { productId, type: type!, qty: moveQty, reason: cleanReason, createdBy: me.id },
        });
        // Back-in-stock: product went from 0 to >0
        if (p.stock === 0 && newStock > 0) {
          notifyBackInStock(productId).catch(() => {});
        }
        return { from: p.stock, to: newStock };
      }
    });

    await audit("inventory.adjust", {
      actorId: me.id, entity: "Product", entityId: productId,
      meta: { type, qty: q, reason: cleanReason, ...result },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed to adjust stock" },
      { status: 500 }
    );
  }
}
