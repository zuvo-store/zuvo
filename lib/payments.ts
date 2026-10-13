import { randomBytes } from "crypto";
import { db } from "./db";
import { getOrderOwned, rebuildDraftOrder, transitionOrder } from "./checkout";
import { audit } from "./audit";
import { notifyAdminNewOrder, notifyCustomerOrderConfirmed, orderEmailData } from "./email";

/**
 * DEMO-ONLY payment provider. No real charge is ever attempted: there is no
 * card-number input anywhere, no gateway SDK, and no network call to a
 * processor. Outcomes are deterministic scenarios chosen by the shopper.
 */
export const DEMO_SCENARIOS = ["success", "declined", "pending", "cancelled", "error"] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export const SCENARIO_LABELS: Record<DemoScenario, string> = {
  success: "Successful test payment",
  declined: "Declined test payment",
  pending: "Pending test payment",
  cancelled: "Cancelled by shopper",
  error: "Technical error",
};

function makeTxnRef(): string {
  return `DEMOTXN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export interface DemoPaymentProvider {
  createPaymentSession(orderId: string): Promise<{ sessionId: string }>;
  processDemoPayment(orderId: string, scenario: DemoScenario): Promise<ProcessResult>;
  getPaymentStatus(paymentId: string): Promise<string>;
  refundDemoPayment(orderId: string, actorId?: string): Promise<void>;
}

export type ProcessResult = {
  ok: boolean;
  paymentStatus: string;
  orderStatus: string;
  message: string;
  transactionRef: string;
};

async function confirmPendingDemoPayment(orderId: string, actorId?: string): Promise<void> {
  // Simulates the provider webhook confirming a previously-pending payment.
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true, items: true } });
  const payment = [...order.payments].reverse().find((p) => p.status === "PENDING");
  if (!payment) throw new Error("No pending payment to confirm.");
  await db.$transaction(async (tx) => {
    // Atomic stock check + deduction; throws on insufficient stock (rolls back).
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
    await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "SUCCEEDED", status: "CONFIRMED" } });
    // Deduct redeemed ZUZU points
    const confirmedOrder = await tx.order.findUnique({ where: { id: orderId }, select: { userId: true, zuzuPointsRedeemed: true, orderNumber: true } });
    if (confirmedOrder?.userId && confirmedOrder.zuzuPointsRedeemed > 0) {
      await tx.user.update({
        where: { id: confirmedOrder.userId },
        data: {
          zuzuPoints: { decrement: confirmedOrder.zuzuPointsRedeemed },
          zuzuPointsLogs: { create: { amount: -confirmedOrder.zuzuPointsRedeemed, kind: "REDEEM", note: `Redeemed on order ${confirmedOrder.orderNumber}` } },
        },
      });
    }
  });
  await audit("payment.demo", { actorId, entity: "Order", entityId: orderId, meta: { scenario: "pending-confirmed", demo: true } });
  await clearCartForOrder(order);
  // Build email data here in request context (DB healthy); the sends below never touch the DB.
  const pendingEmailUser = order.userId
    ? await db.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } })
    : null;
  const pendingEmailData = orderEmailData({ ...order, user: pendingEmailUser });
  // Notify admin of the new order — fire and forget.
  notifyAdminNewOrder(pendingEmailData.admin).catch((e) =>
    console.error("[zuvo] admin new-order email failed:", e instanceof Error ? e.message : e)
  );
  // Notify the customer that their order is confirmed — fire and forget.
  notifyCustomerOrderConfirmed(pendingEmailData.customer).catch((e) =>
    console.error("[zuvo] customer order-confirmed email failed:", e instanceof Error ? e.message : e)
  );
}

async function clearCartForOrder(order: { userId: string | null; guestToken: string | null }) {
  if (order.userId) {
    await db.cartItem.deleteMany({ where: { userId: order.userId } });
  } else if (order.guestToken) {
    await db.cartItem.deleteMany({ where: { guestToken: order.guestToken, userId: null } });
  }
}

export const DemoPaymentProvider: DemoPaymentProvider = {
  async createPaymentSession(orderId: string) {
    const order = await getOrderOwned(orderId);
    if (!order) throw new Error("Order not found.");
    return { sessionId: `demosess_${order.id}` };
  },

  async processDemoPayment(orderId: string, scenario: DemoScenario): Promise<ProcessResult> {
    if (!DEMO_SCENARIOS.includes(scenario)) throw new Error("Unknown payment scenario.");
    const owned = await getOrderOwned(orderId);
    if (!owned) throw new Error("Order not found.");
    if (owned.status !== "DRAFT" && owned.status !== "PENDING_PAYMENT") {
      throw new Error("This order can no longer be paid.");
    }

    // Re-price everything from the database right before the simulated charge.
    const order = await rebuildDraftOrder(orderId);
    if (order.totalCents <= 0) throw new Error("Order total is invalid.");

    const transactionRef = makeTxnRef();
    const base = {
      orderId,
      provider: "demo",
      scenario,
      amountCents: order.totalCents,
      currency: order.currency,
      transactionRef,
    };

    switch (scenario) {
      case "success": {
        // Everything that must stay consistent (stock, payment, order) happens
        // in ONE transaction: if stock is insufficient the whole thing rolls back.
        await db.$transaction(async (tx) => {
          for (const item of order.items) {
            if (item.variantId) {
              const v = await tx.productVariant.findUniqueOrThrow({ where: { id: item.variantId } });
              if (v.stock < item.qty) throw new Error(`Insufficient stock for "${item.name}". Only ${v.stock} left.`);
              await tx.productVariant.update({ where: { id: v.id }, data: { stock: v.stock - item.qty } });
            } else if (item.productId) {
              const p = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
              if (p.stock < item.qty) throw new Error(`Insufficient stock for "${item.name}". Only ${p.stock} left.`);
              await tx.product.update({ where: { id: p.id }, data: { stock: p.stock - item.qty } });
            }
          }
          await tx.payment.create({ data: { ...base, status: "SUCCEEDED", resultJson: { demo: true, scenario } } });
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "SUCCEEDED", status: "CONFIRMED" } });
          // Deduct redeemed ZUZU points
          const ok2 = await tx.order.findUnique({ where: { id: orderId }, select: { userId: true, zuzuPointsRedeemed: true, orderNumber: true } });
          if (ok2?.userId && ok2.zuzuPointsRedeemed > 0) {
            await tx.user.update({
              where: { id: ok2.userId },
              data: {
                zuzuPoints: { decrement: ok2.zuzuPointsRedeemed },
                zuzuPointsLogs: { create: { amount: -ok2.zuzuPointsRedeemed, kind: "REDEEM", note: `Redeemed on order ${ok2.orderNumber}` } },
              },
            });
          }
        });
        await audit("payment.demo", { actorId: order.userId ?? undefined, entity: "Order", entityId: orderId, meta: { scenario, transactionRef } });
        await clearCartForOrder(order);
        // Build email data here in request context (DB healthy); the sends below never touch the DB.
        const successEmailUser = order.userId
          ? await db.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } })
          : null;
        const successEmailData = orderEmailData({ ...order, user: successEmailUser });
        // Notify admin of the new order — fire and forget.
        notifyAdminNewOrder(successEmailData.admin).catch((e) =>
          console.error("[zuvo] admin new-order email failed:", e instanceof Error ? e.message : e)
        );
        // Notify the customer that their order is confirmed — fire and forget.
        notifyCustomerOrderConfirmed(successEmailData.customer).catch((e) =>
          console.error("[zuvo] customer order-confirmed email failed:", e instanceof Error ? e.message : e)
        );
        return { ok: true, paymentStatus: "SUCCEEDED", orderStatus: "CONFIRMED", message: "Demo payment successful.", transactionRef };
      }
      case "declined": {
        await db.$transaction(async (tx) => {
          await tx.payment.create({ data: { ...base, status: "DECLINED", resultJson: { demo: true, scenario, reason: "insufficient_funds (simulated)" } } });
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "DECLINED", status: "PENDING_PAYMENT" } });
        });
        return { ok: false, paymentStatus: "DECLINED", orderStatus: "PENDING_PAYMENT", message: "Payment declined. Please try another card.", transactionRef };
      }
      case "pending": {
        await db.$transaction(async (tx) => {
          await tx.payment.create({ data: { ...base, status: "PENDING", resultJson: { demo: true, scenario } } });
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "PENDING", status: "PENDING_PAYMENT" } });
        });
        return { ok: true, paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT", message: "Payment is pending confirmation.", transactionRef };
      }
      case "cancelled": {
        await db.$transaction(async (tx) => {
          await tx.payment.create({ data: { ...base, status: "CANCELLED", resultJson: { demo: true, scenario } } });
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "CANCELLED", status: "PENDING_PAYMENT" } });
        });
        return { ok: false, paymentStatus: "CANCELLED", orderStatus: "PENDING_PAYMENT", message: "Payment was cancelled. Your cart is preserved.", transactionRef };
      }
      case "error":
      default: {
        await db.$transaction(async (tx) => {
          await tx.payment.create({ data: { ...base, status: "FAILED", resultJson: { demo: true, scenario, reason: "processor_timeout (simulated)" } } });
          await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "FAILED", status: "PENDING_PAYMENT" } });
        });
        return { ok: false, paymentStatus: "FAILED", orderStatus: "PENDING_PAYMENT", message: "A technical error occurred. Your cart and order summary are preserved — please try again.", transactionRef };
      }
    }
  },

  async getPaymentStatus(paymentId: string) {
    const p = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
    return p.status;
  },

  async refundDemoPayment(orderId: string, actorId?: string) {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
    const succeeded = [...order.payments].reverse().find((p) => p.status === "SUCCEEDED");
    if (!succeeded) throw new Error("No successful payment to refund.");
    const { restoreInventory } = await import("./checkout");
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: succeeded.id }, data: { status: "REFUNDED" } });
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    });
    await restoreInventory(orderId);
    if (order.status !== "REFUNDED") {
      // move through valid transitions to REFUNDED
      const path: Record<string, string> = { CONFIRMED: "CANCELLED", PROCESSING: "CANCELLED", SHIPPED: "CANCELLED", DELIVERED: "REFUNDED" };
      let cur = order.status;
      while (cur !== "REFUNDED" && path[cur]) {
        // Intermediate CANCELLED step is bookkeeping — only email the final REFUNDED status.
        await transitionOrder(orderId, path[cur], actorId, "demo refund", { silent: path[cur] === "CANCELLED" });
        cur = path[cur];
      }
      if (cur === "DELIVERED") await transitionOrder(orderId, "REFUNDED", actorId, "demo refund");
    }
    await audit("payment.refund", { actorId, entity: "Order", entityId: orderId, meta: { demo: true } });
  },
};

// Exported for the admin "simulate provider confirmation" action.
export { confirmPendingDemoPayment };
