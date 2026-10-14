export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { normalizeEmail, rateLimit } from "@/lib/auth";

/**
 * Guest order lookup by order number + email. Never enumerates orders;
 * always returns the same generic 404 for unknown orders and email mismatches.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    orderNumber?: unknown;
    email?: unknown;
  } | null;
  const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim().toUpperCase() : "";
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!orderNumber || !email) {
    return Response.json({ ok: false, error: "Order number and email are required." }, { status: 400 });
  }
  const rl = rateLimit(`track:${email}`, 10, 60_000);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: `Too many attempts. Try again in ${rl.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { user: { select: { email: true } }, items: { include: { product: { select: { slug: true } } } }, payments: { select: { provider: true }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const matches =
    order &&
    order.status !== "DRAFT" &&
    (order.guestEmail === email || (order.user && order.user.email === email));
  if (!matches || !order) {
    return Response.json({ ok: false, error: "Order not found." }, { status: 404 });
  }
  return Response.json({
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      isCod: order.payments.some((p) => p.provider === "cod"),
      totalCents: order.totalCents,
      currency: order.currency,
      createdAt: order.createdAt,
      deliveryLabel: order.deliveryLabel,
      items: order.items.map((i) => ({ name: i.name, variantLabel: i.variantLabel, qty: i.qty, slug: i.product?.slug ?? null })),
    },
  });
}
