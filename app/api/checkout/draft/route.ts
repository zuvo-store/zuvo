export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder } from "@/lib/checkout";

export async function GET() {
  const order = await getOrCreateDraftOrder();
  return Response.json({
    ok: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      contactJson: order.contactJson,
      addressJson: order.addressJson,
      deliveryMethod: order.deliveryMethod,
      promoCode: order.promoCode,
    },
  });
}
