import { db } from "./db";
import { getGuestToken, getSessionUser } from "./auth";

// ------------------------------------------------------------------ cart lines
export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: string | null;
  variantLabel: string | null;
  unitPriceCents: number;
  originalUnitPriceCents: number | null;
  qty: number;
  lineTotalCents: number;
  stockAvailable: number;
  active: boolean;
};

function firstImage(images: unknown): string | null {
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === "string") return images[0];
  return null;
}

export async function getCartOwner(): Promise<{ userId: string | null; guestToken: string }> {
  const user = await getSessionUser();
  const guestToken = await getGuestToken();
  return { userId: user ? user.id : null, guestToken };
}

export async function getCart(): Promise<{ lines: CartLine[]; count: number; subtotalCents: number }> {
  const { userId, guestToken } = await getCartOwner();
  const items = await db.cartItem.findMany({
    where: userId ? { userId } : { guestToken, userId: null },
    include: { product: true, variant: true },
    orderBy: { createdAt: "asc" },
  });
  const lines: CartLine[] = items.map((it) => {
    const p = it.product;
    const v = it.variant;
    const unit = p.priceCents + (v ? v.priceDeltaCents : 0);
    const origUnit = p.originalPriceCents != null ? p.originalPriceCents + (v ? v.priceDeltaCents : 0) : null;
    return {
      id: it.id,
      productId: p.id,
      variantId: v ? v.id : null,
      name: p.name,
      slug: p.slug,
      image: firstImage(p.images),
      variantLabel: v ? `${v.name}: ${v.value}` : null,
      unitPriceCents: unit,
      originalUnitPriceCents: origUnit,
      qty: it.qty,
      lineTotalCents: unit * it.qty,
      stockAvailable: v ? v.stock : p.stock,
      active: p.active,
    };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  return { lines, count, subtotalCents };
}

export async function cartCount(): Promise<number> {
  const c = await getCart();
  return c.count;
}

/** Server-side add with stock validation. Never trusts browser prices. */
export async function addToCart(
  productId: string,
  variantId: string | null,
  qty: number
): Promise<{ ok: boolean; error?: string; count?: number; loginRequired?: boolean }> {
  const { getSessionUser } = await import("./auth");
  const sessionUser = await getSessionUser();
  if (!sessionUser) return { ok: false, error: "Please log in to add items to your cart.", loginRequired: true };
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return { ok: false, error: "Quantity must be between 1 and 99." };
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product || !product.active) return { ok: false, error: "This product is not available." };

  let variant: { id: string; stock: number } | null = null;
  if (variantId) {
    variant = product.variants.find((v) => v.id === variantId) ?? null;
    if (!variant) return { ok: false, error: "Selected variant is invalid." };
  } else if (product.variants.length > 0) {
    return { ok: false, error: "Please select a variant." };
  }

  const available = variant ? variant.stock : product.stock;
  if (available < 1) return { ok: false, error: "This item is out of stock." };

  const { userId, guestToken } = await getCartOwner();

  // NB: variantId is nullable, so we use findFirst instead of the compound
  // unique (Prisma compound-unique lookups don't accept null components).
  const existing = await db.cartItem.findFirst({
    where: userId
      ? { userId, productId, variantId }
      : { guestToken, userId: null, productId, variantId },
  });
  const newQty = (existing?.qty ?? 0) + qty;
  if (newQty > available) {
    return { ok: false, error: `Only ${available} in stock.` };
  }
  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { qty: newQty } });
  } else {
    await db.cartItem.create({
      data: { userId, guestToken: userId ? null : guestToken, productId, variantId, qty },
    });
  }
  const count = await cartCount();
  return { ok: true, count };
}

export async function setCartQty(itemId: string, qty: number): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(qty) || qty < 0 || qty > 99) return { ok: false, error: "Invalid quantity." };
  const { userId, guestToken } = await getCartOwner();
  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { product: true, variant: true },
  });
  if (!item) return { ok: false, error: "Item not found." };
  const owned = userId ? item.userId === userId : item.userId === null && item.guestToken === guestToken;
  if (!owned) return { ok: false, error: "Item not found." };
  if (qty === 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return { ok: true };
  }
  const available = item.variant ? item.variant.stock : item.product.stock;
  if (qty > available) return { ok: false, error: `Only ${available} in stock.` };
  await db.cartItem.update({ where: { id: itemId }, data: { qty } });
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<{ ok: boolean }> {
  const { userId, guestToken } = await getCartOwner();
  const item = await db.cartItem.findUnique({ where: { id: itemId } });
  if (!item) return { ok: true };
  const owned = userId ? item.userId === userId : item.userId === null && item.guestToken === guestToken;
  if (!owned) return { ok: false };
  await db.cartItem.delete({ where: { id: itemId } });
  return { ok: true };
}

export async function clearCart() {
  const { userId, guestToken } = await getCartOwner();
  if (userId) {
    await db.cartItem.deleteMany({ where: { userId } });
  } else {
    await db.cartItem.deleteMany({ where: { guestToken, userId: null } });
  }
}

/** Merge guest cart into the user's cart after login. Caps quantities at available stock. */
export async function mergeGuestCartIntoUser(userId: string, guestToken: string) {
  const guestItems = await db.cartItem.findMany({
    where: { guestToken, userId: null },
    include: { product: true, variant: true },
  });
  for (const gi of guestItems) {
    const available = gi.variant ? gi.variant.stock : gi.product.stock;
    if (!gi.product.active || available < 1) {
      await db.cartItem.delete({ where: { id: gi.id } });
      continue;
    }
    const existing = await db.cartItem.findFirst({
      where: { userId, productId: gi.productId, variantId: gi.variantId },
    });
    if (existing) {
      const merged = Math.min(existing.qty + gi.qty, available, 99);
      await db.cartItem.update({ where: { id: existing.id }, data: { qty: merged } });
      await db.cartItem.delete({ where: { id: gi.id } });
    } else {
      await db.cartItem.update({
        where: { id: gi.id },
        data: { userId, guestToken: null, qty: Math.min(gi.qty, available, 99) },
      });
    }
  }
}

// ------------------------------------------------------------------ totals
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
export const STANDARD_SHIPPING_CENTS = 499;
export const EXPRESS_SHIPPING_CENTS = 1299;

export function estimateShipping(subtotalCents: number, method: "STANDARD" | "EXPRESS" = "STANDARD"): number {
  if (subtotalCents <= 0) return 0;
  if (method === "EXPRESS") return EXPRESS_SHIPPING_CENTS;
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : STANDARD_SHIPPING_CENTS;
}

export function cartTotals(
  subtotalCents: number,
  opts: { shippingCents: number; discountCents?: number; taxCents?: number } = { shippingCents: 0 }
) {
  const discountCents = opts.discountCents ?? 0;
  const taxCents = opts.taxCents ?? 0;
  const totalCents = Math.max(0, subtotalCents - discountCents + opts.shippingCents + taxCents);
  return { subtotalCents, discountCents, shippingCents: opts.shippingCents, taxCents, totalCents };
}
