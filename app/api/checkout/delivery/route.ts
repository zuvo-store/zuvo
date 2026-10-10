export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder, saveDraftDelivery } from "@/lib/checkout";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    method?: unknown;
    promoCode?: unknown;
  } | null;
  const method = typeof body?.method === "string" ? body.method.toUpperCase() : "";
  if (method !== "STANDARD" && method !== "EXPRESS") {
    return Response.json({ ok: false, error: "Delivery method must be STANDARD or EXPRESS." }, { status: 400 });
  }
  const promoCode =
    typeof body?.promoCode === "string" && body.promoCode.trim() ? body.promoCode.trim() : undefined;
  const draft = await getOrCreateDraftOrder();
  try {
    await saveDraftDelivery(draft.id, method, promoCode);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not save delivery method." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
