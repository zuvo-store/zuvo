import { randomBytes } from "crypto";
import { db } from "./db";
import { getGuestToken, getSessionUser } from "./auth";
import { getCart, estimateShipping } from "./cart";
import { audit } from "./audit";

export const ORDER_STATUSES = [
  "DRAFT",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const PAYMENT_STATUSES = [
  "UNPAID",
  "PENDING",
  "SUCCEEDED",
  "DECLINED",
  "CANCELLED",
  "FAILED",
  "REFUNDED",
] as const;

/** Allowed order-status transitions. Payment status is tracked separately. */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to);
}

function makeOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `ZV-${ymd}-${rand}`;
}

export type CheckoutOwner = { userId: string | null; guestToken: string };

export async function getCheckoutOwner(): Promise<CheckoutOwner> {
  const user = await getSessionUser();
  const guestToken = await getGuestToken();
  return { userId: user ? user.id : null, guestToken };
}

/** The single in-progress draft order for this visitor. */
export async function getOrCreateDraftOrder() {
  const { userId, guestToken } = await getCheckoutOwner();
  const existing = await db.order.findFirst({
    where: userId ? { userId, status: "DRAFT" } : { guestToken, userId: null, status: "DRAFT" },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });
  if (existing) return existing;
  return db.order.create({
    data: {
      orderNumber: makeOrderNumber(),
      userId,
      guestToken: userId ? null : guestToken,
      status: "DRAFT",
      paymentStatus: "UNPAID",
    },
    include: { items: true },
  });
}

export async function getOrderOwned(orderId: string) {
  const { userId, guestToken } = await getCheckoutOwner();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true } });
  if (!order) return null;
  const owned = userId ? order.userId === userId : order.userId === null && order.guestToken === guestToken;
  return owned ? order : null;
}

export type ContactInfo = { name: string; email: string; phone?: string };
export type ShippingAddress = {
  country: string;
  state: string;
  city: string;
  street: string;
  apartment?: string;
  postalCode: string;
};

export async function saveDraftContact(orderId: string, contact: ContactInfo) {
  const order = await getOrderOwned(orderId);
  if (!order || order.status !== "DRAFT") throw new Error("Order not available.");
  if (!contact.name.trim()) throw new Error("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) throw new Error("Valid email is required.");
  return db.order.update({
    where: { id: orderId },
    data: { contactJson: contact, guestName: contact.name.trim(), guestEmail: contact.email.trim().toLowerCase() },
  });
}

export async function saveDraftShipping(orderId: string, address: ShippingAddress) {
  const order = await getOrderOwned(orderId);
  if (!order || order.status !== "DRAFT") throw new Error("Order not available.");
  for (const [k, v] of Object.entries(address)) {
    if (k === "apartment") continue;
    if (!String(v ?? "").trim()) throw new Error("All address fields are required.");
  }
  return db.order.update({ where: { id: orderId }, data: { addressJson: address } });
}

export async function saveDraftDelivery(orderId: string, method: "STANDARD" | "EXPRESS", promoCode?: string) {
  const order = await getOrderOwned(orderId);
  if (!order || order.status !== "DRAFT") throw new Error("Order not available.");
  let discountCents = 0;
  let promo: string | null = null;
  if (promoCode?.trim()) {
    const p = await db.promotion.findUnique({ where: { code: promoCode.trim().toUpperCase() } });
    const now = new Date();
    const valid =
      p && p.active && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now) &&
      (!p.usageLimit || p.usedCount < p.usageLimit);
    if (!valid) throw new Error("Promo code is invalid or expired.");
    promo = p.code;
    // discount computed against the live subtotal at rebuild time; store code only
    void discountCents;
  }
  return db.order.update({
    where: { id: orderId },
    data: {
      deliveryMethod: method,
      deliveryLabel: method === "EXPRESS" ? "Express Delivery (2–4 business days, illustrative)" : "Standard Delivery (5–8 business days, illustrative)",
      promoCode: promo,
    },
  });
}

/**
 * Rebuild order items + totals from the CURRENT cart, priced from the database.
 * Never trusts browser prices. Throws if cart is empty or stock is insufficient.
 */
export async function rebuildDraftOrder(orderId: string) {
  const order = await getOrderOwned(orderId);
  if (!order || (order.status !== "DRAFT" && order.status !== "PENDING_PAYMENT")) {
    throw new Error("Order not available.");
  }
  const cart = await getCart();
  if (cart.lines.length === 0) throw new Error("Your cart is empty.");

  for (const l of cart.lines) {
    if (!l.active) throw new Error(`"${l.name}" is no longer available.`);
    if (l.qty > l.stockAvailable) throw new Error(`Only ${l.stockAvailable} of "${l.name}" in stock.`);
  }

  const subtotalCents = cart.subtotalCents;
  const method = (order.deliveryMethod as "STANDARD" | "EXPRESS" | null) ?? "STANDARD";
  const shippingCents = estimateShipping(subtotalCents, method);

  let discountCents = 0;
  let campaignId: string | null = null;
  let campaignName: string | null = null;
  if (order.promoCode) {
    const p = await db.promotion.findUnique({ where: { code: order.promoCode } });
    const now = new Date();
    if (p && p.active && (!p.startsAt || p.startsAt <= now) && (!p.endsAt || p.endsAt >= now) &&
        (!p.usageLimit || p.usedCount < p.usageLimit) && subtotalCents >= p.minOrderCents) {
      discountCents = p.discountType === "PERCENT"
        ? Math.round((subtotalCents * Math.min(p.discountValue, 90)) / 100)
        : Math.min(p.discountValue, subtotalCents);
    }
  }
  // Auto-apply best live campaign (only when no promo code beat it)
  if (!order.promoCode || discountCents === 0) {
    const { getActiveCampaigns, bestCampaignFor } = await import("./campaigns");
    const live = await getActiveCampaigns();
    if (live.length > 0) {
      const prodIds = [...new Set(cart.lines.map((l) => l.productId))];
      const prods = await db.product.findMany({
        where: { id: { in: prodIds } },
        select: { id: true, categoryId: true },
      });
      const catOf = new Map(prods.map((p) => [p.id, p.categoryId]));
      const items = cart.lines.map((l) => ({
        priceCents: l.unitPriceCents,
        qty: l.qty,
        categoryId: catOf.get(l.productId) ?? "",
      }));
      const best = bestCampaignFor(live, items, subtotalCents);
      if (best && best.discountCents > discountCents) {
        discountCents = best.discountCents;
        campaignId = best.campaign.id;
        campaignName = best.campaign.name;
      }
    }
  }

  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);

  // ZUZU points redemption: 1000 pts = $1 (100 cents), capped by balance & total
  let zuzuPointsRedeemed = 0;
  let zuzuDiscountCents = 0;
  if (order.zuzuPointsRedeemed > 0 && order.userId) {
    const u = await db.user.findUnique({ where: { id: order.userId }, select: { zuzuPoints: true } });
    const balance = u?.zuzuPoints ?? 0;
    const usable = Math.min(order.zuzuPointsRedeemed, balance);
    const maxDiscount = Math.max(0, totalCents);
    zuzuDiscountCents = Math.min(Math.floor(usable / 1000) * 100, maxDiscount);
    zuzuPointsRedeemed = Math.floor(zuzuDiscountCents / 100) * 1000;
  }
  const finalTotalCents = Math.max(0, totalCents - zuzuDiscountCents);

  await db.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId } });
    await tx.orderItem.createMany({
      data: cart.lines.map((l) => ({
        orderId,
        productId: l.productId,
        variantId: l.variantId,
        name: l.name,
        variantLabel: l.variantLabel,
        image: l.image,
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
        lineTotalCents: l.lineTotalCents,
      })),
    });
    await tx.order.update({
      where: { id: orderId },
      data: { subtotalCents, discountCents, shippingCents, taxCents: 0, totalCents: finalTotalCents, currency: "USD", zuzuPointsRedeemed, zuzuDiscountCents, campaignId, campaignName },
    });
  });

  return db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
}

/** Atomically deduct inventory for a paid order. Throws (rolling back) on insufficient stock. */
export async function deductInventory(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variantId) {
        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
        if (v.stock < item.qty) throw new Error(`Insufficient stock for "${item.name}".`);
        await tx.productVariant.update({ where: { id: v.id }, data: { stock: v.stock - item.qty } });
      } else if (item.productId) {
        const p = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        if (p.stock < item.qty) throw new Error(`Insufficient stock for "${item.name}".`);
        await tx.product.update({ where: { id: p.id }, data: { stock: p.stock - item.qty } });
      }
    }
  });
}

/** Restore inventory (used on refunds/cancels of confirmed orders). */
export async function restoreInventory(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await db.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
      } else if (item.productId) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
      }
    }
  });
}

export async function transitionOrder(orderId: string, to: string, actorId?: string, note?: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (!canTransition(order.status, to)) {
    throw new Error(`Cannot move order from ${order.status} to ${to}.`);
  }
  const updated = await db.order.update({ where: { id: orderId }, data: { status: to } });
  await audit("order.status", { actorId, entity: "Order", entityId: orderId, meta: { from: order.status, to, note } });
  return updated;
}
