import { randomBytes } from "crypto";
import Stripe from "stripe";
import { db } from "./db";
import { getOrderOwned, rebuildDraftOrder, transitionOrder } from "./checkout";
import { audit } from "./audit";
import { notifyAdminNewOrder, notifyCustomerOrderConfirmed, orderEmailData } from "./email";

/**
 * STRIPE (test mode) helpers. The Stripe client is constructed lazily so this
 * module loads fine when Stripe env vars are absent; every Stripe entry point
 * throws a friendly error instead.
 */
let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured yet (STRIPE_SECRET_KEY missing).");
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

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

export interface ConfirmOrderPaymentInput {
  provider: string; // "demo" | "cod" | "stripe"
  scenario: string; // demo scenario | "cod" | "stripe"
  transactionRef: string; // DEMOTXN-... | pi_...
  paymentStatus: "SUCCEEDED" | "PENDING"; // COD keeps payment PENDING until cash is collected
  resultJson: unknown;
  auditEvent: string; // "payment.demo" | "payment.cod" | "payment.stripe"
  auditMeta: Record<string, unknown>;
}

/**
 * Shared order-confirmation core used by the demo success path, COD, and
 * Stripe: atomic stock deduction, payment row, order → CONFIRMED, ZUZU point
 * deduction, cart clearing, and admin + customer emails.
 *
 * Idempotent: if a payment with the same transactionRef is already SUCCEEDED
 * (e.g. webhook and client confirm racing), it returns the order number
 * without touching stock twice.
 */
export async function confirmOrderWithPayment(
  orderId: string,
  input: ConfirmOrderPaymentInput,
): Promise<{ orderNumber: string }> {
  const already = await db.payment.findFirst({
    where: { orderId, transactionRef: input.transactionRef, status: "SUCCEEDED" },
    select: { id: true },
  });
  if (already) {
    const done = await db.order.findUniqueOrThrow({ where: { id: orderId }, select: { orderNumber: true } });
    return { orderNumber: done.orderNumber };
  }

  const owned = await getOrderOwned(orderId);
  if (!owned) throw new Error("Order not found.");
  if (owned.status !== "DRAFT" && owned.status !== "PENDING_PAYMENT") {
    throw new Error("This order can no longer be paid.");
  }

  // Re-price everything from the database right before confirming.
  const order = await rebuildDraftOrder(orderId);
  if (order.totalCents <= 0) throw new Error("Order total is invalid.");

  await db.$transaction(async (tx) => {
    // Atomic stock check + deduction; throws on insufficient stock (rolls back).
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
    // Reuse the payment row when one was pre-created (e.g. Stripe intent),
    // otherwise record a fresh one.
    const existingRow = await tx.payment.findFirst({ where: { orderId, transactionRef: input.transactionRef } });
    const paymentData = {
      provider: input.provider,
      scenario: input.scenario,
      amountCents: order.totalCents,
      currency: order.currency,
      transactionRef: input.transactionRef,
      status: input.paymentStatus,
      resultJson: input.resultJson as object,
    };
    if (existingRow) {
      await tx.payment.update({ where: { id: existingRow.id }, data: paymentData });
    } else {
      await tx.payment.create({ data: { orderId, ...paymentData } });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: input.paymentStatus, status: "CONFIRMED" },
    });
    // Deduct redeemed ZUZU points
    const confirmedOrder = await tx.order.findUnique({
      where: { id: orderId },
      select: { userId: true, zuzuPointsRedeemed: true, orderNumber: true },
    });
    if (confirmedOrder?.userId && confirmedOrder.zuzuPointsRedeemed > 0) {
      await tx.user.update({
        where: { id: confirmedOrder.userId },
        data: {
          zuzuPoints: { decrement: confirmedOrder.zuzuPointsRedeemed },
          zuzuPointsLogs: {
            create: {
              amount: -confirmedOrder.zuzuPointsRedeemed,
              kind: "REDEEM",
              note: `Redeemed on order ${confirmedOrder.orderNumber}`,
            },
          },
        },
      });
    }
  });
  await audit(input.auditEvent, {
    actorId: order.userId ?? undefined,
    entity: "Order",
    entityId: orderId,
    meta: input.auditMeta,
  });
  await clearCartForOrder(order);
  // Build email data here in request context (DB healthy); the sends below never touch the DB.
  const emailUser = order.userId
    ? await db.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } })
    : null;
  const emailData = orderEmailData({ ...order, user: emailUser });
  // Notify admin of the new order — fire and forget.
  notifyAdminNewOrder(emailData.admin).catch((e) =>
    console.error("[zuvo] admin new-order email failed:", e instanceof Error ? e.message : e),
  );
  // Notify the customer that their order is confirmed — fire and forget.
  notifyCustomerOrderConfirmed(emailData.customer).catch((e) =>
    console.error("[zuvo] customer order-confirmed email failed:", e instanceof Error ? e.message : e),
  );
  return { orderNumber: order.orderNumber };
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
        await confirmOrderWithPayment(orderId, {
          provider: "demo",
          scenario,
          transactionRef,
          paymentStatus: "SUCCEEDED",
          resultJson: { demo: true, scenario },
          auditEvent: "payment.demo",
          auditMeta: { scenario, transactionRef },
        });
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

/**
 * CASH ON DELIVERY flow. No card is charged: the order is confirmed
 * immediately, stock is reserved, and payment is collected in cash when the
 * order is delivered. The Payment row is recorded with provider "cod" and
 * status PENDING until the admin marks it received.
 */
export async function processCodPayment(orderId: string): Promise<{ ok: boolean; orderNumber: string }> {
  const { orderNumber } = await confirmOrderWithPayment(orderId, {
    provider: "cod",
    scenario: "cod",
    transactionRef: `COD-${orderId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    paymentStatus: "PENDING",
    resultJson: { cod: true },
    auditEvent: "payment.cod",
    auditMeta: { cod: true },
  });
  return { ok: true, orderNumber };
}

/**
 * Admin marks a COD order's cash as received (e.g. on delivery). Only flips
 * payment statuses — stock was already reserved when the COD order was placed.
 */
export async function markCodPaymentReceived(orderId: string, actorId?: string): Promise<void> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
  const codPayment = [...order.payments].reverse().find((p) => p.provider === "cod" && p.status === "PENDING");
  if (!codPayment) throw new Error("No pending COD payment to mark as received.");
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: codPayment.id }, data: { status: "SUCCEEDED" } });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "SUCCEEDED" } });
  });
  await audit("payment.cod_received", { actorId, entity: "Order", entityId: orderId });
}

/* ------------------------------------------------------------------ */
/* STRIPE (test mode)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Creates (or reuses) a Stripe PaymentIntent for the caller's draft order.
 * A PENDING Payment row is recorded with the intent id as transactionRef so
 * the webhook / confirm endpoint can match it later.
 */
export async function createStripePaymentIntent(
  orderId: string,
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();
  const owned = await getOrderOwned(orderId);
  if (!owned) throw new Error("Order not found.");
  if (owned.status !== "DRAFT" && owned.status !== "PENDING_PAYMENT") {
    throw new Error("This order can no longer be paid.");
  }

  // Re-price everything from the database right before the charge.
  const order = await rebuildDraftOrder(orderId);
  if (order.totalCents <= 0) throw new Error("Order total is invalid.");

  // Reuse an existing pending intent for this order when it still matches.
  const existingPending = await db.payment.findFirst({
    where: { orderId, provider: "stripe", status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (existingPending?.transactionRef) {
    const pi = await stripe.paymentIntents.retrieve(existingPending.transactionRef).catch(() => null);
    if (pi && pi.status !== "canceled" && pi.amount === order.totalCents && pi.client_secret) {
      return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
    }
  }

  const pi = await stripe.paymentIntents.create({
    amount: order.totalCents,
    currency: (order.currency || "USD").toLowerCase(),
    metadata: { orderId, orderNumber: order.orderNumber },
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });
  if (!pi.client_secret) throw new Error("Stripe did not return a client secret.");
  const testMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  await db.payment.create({
    data: {
      orderId,
      provider: "stripe",
      scenario: "stripe",
      amountCents: order.totalCents,
      currency: order.currency,
      transactionRef: pi.id,
      status: "PENDING",
      resultJson: { stripe: true, stripeTestMode: testMode },
    },
  });
  return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
}

/**
 * Confirms an order after Stripe reports the PaymentIntent as succeeded.
 * Verifies the intent with Stripe first, then runs the shared confirmation
 * core. Idempotent — safe to call from both the client confirm endpoint and
 * the webhook.
 */
export async function confirmStripePayment(
  orderId: string,
  paymentIntentId: string,
): Promise<{ orderNumber: string }> {
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  const metaOrderId = typeof pi.metadata?.orderId === "string" ? pi.metadata.orderId : "";
  if (metaOrderId && metaOrderId !== orderId) {
    throw new Error("Payment intent does not belong to this order.");
  }
  if (pi.status !== "succeeded") {
    throw new Error(`Stripe payment is ${pi.status}, not succeeded.`);
  }
  const owned = await getOrderOwned(orderId);
  if (!owned) throw new Error("Order not found.");
  const order = await rebuildDraftOrder(orderId);
  if (pi.amount !== order.totalCents) {
    throw new Error("Paid amount does not match the order total.");
  }
  const testMode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  const { orderNumber } = await confirmOrderWithPayment(orderId, {
    provider: "stripe",
    scenario: "stripe",
    transactionRef: pi.id,
    paymentStatus: "SUCCEEDED",
    resultJson: { stripe: true, paymentIntentId: pi.id, stripeTestMode: testMode },
    auditEvent: "payment.stripe",
    auditMeta: { paymentIntentId: pi.id },
  });
  return { orderNumber };
}
