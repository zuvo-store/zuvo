export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder } from "@/lib/checkout";
import { processCodPayment } from "@/lib/payments";

/**
 * Cash-on-delivery order placement. No card is charged: the order is
 * confirmed, stock is reserved, and the customer pays cash on delivery.
 */
export async function POST() {
  const draft = await getOrCreateDraftOrder();
  let result;
  try {
    result = await processCodPayment(draft.id);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Order could not be placed." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true, orderNumber: result.orderNumber });
}
