export const dynamic = "force-dynamic";

import { getOrderOwned } from "@/lib/checkout";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const order = await getOrderOwned(id);
  if (!order) {
    return Response.json({ ok: false, error: "Order not found." }, { status: 404 });
  }
  return Response.json({
    ok: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      currency: order.currency,
      promoCode: order.promoCode,
      deliveryMethod: order.deliveryMethod,
      deliveryLabel: order.deliveryLabel,
      contactJson: order.contactJson,
      addressJson: order.addressJson,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        id: i.id,
        name: i.name,
        variantLabel: i.variantLabel,
        image: i.image,
        qty: i.qty,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
      })),
      payments: order.payments.map((p) => ({
        id: p.id,
        scenario: p.scenario,
        status: p.status,
        amountCents: p.amountCents,
        transactionRef: p.transactionRef,
        createdAt: p.createdAt,
      })),
    },
  });
}
