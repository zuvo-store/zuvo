export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder, rebuildDraftOrder } from "@/lib/checkout";

export async function GET() {
  const draft = await getOrCreateDraftOrder();
  let order;
  try {
    order = await rebuildDraftOrder(draft.id);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not build the order summary." },
      { status: 400 }
    );
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
      items: order.items.map((i) => ({
        name: i.name,
        variantLabel: i.variantLabel,
        image: i.image,
        qty: i.qty,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
      })),
    },
  });
}
