export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder } from "@/lib/checkout";
import { confirmPendingDemoPayment } from "@/lib/payments";

/**
 * Simulates the payment provider's webhook confirming a previously-pending
 * demo payment. DEMO ONLY — no real money moves.
 */
export async function POST() {
  const draft = await getOrCreateDraftOrder();
  try {
    await confirmPendingDemoPayment(draft.id);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "No pending payment to confirm." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true, orderNumber: draft.orderNumber });
}
