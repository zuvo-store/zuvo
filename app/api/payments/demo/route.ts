export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder } from "@/lib/checkout";
import { DemoPaymentProvider, DEMO_SCENARIOS, type DemoScenario } from "@/lib/payments";

/**
 * DEMO-ONLY payment endpoint. No real charge is attempted: the shopper only
 * picks a simulated outcome scenario. Message copy comes from the lib.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { scenario?: unknown } | null;
  const scenario = typeof body?.scenario === "string" ? body.scenario : "";
  if (!(DEMO_SCENARIOS as readonly string[]).includes(scenario)) {
    return Response.json(
      { ok: false, error: `scenario must be one of: ${DEMO_SCENARIOS.join(", ")}.` },
      { status: 400 }
    );
  }
  const draft = await getOrCreateDraftOrder();
  let result;
  try {
    result = await DemoPaymentProvider.processDemoPayment(draft.id, scenario as DemoScenario);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Payment could not be processed." },
      { status: 400 }
    );
  }
  return Response.json({ ...result, orderNumber: draft.orderNumber });
}
