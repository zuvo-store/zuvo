export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder, saveDraftShipping } from "@/lib/checkout";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    country?: unknown;
    state?: unknown;
    city?: unknown;
    street?: unknown;
    apartment?: unknown;
    postalCode?: unknown;
  } | null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const address = {
    country: str(body?.country),
    state: str(body?.state),
    city: str(body?.city),
    street: str(body?.street),
    apartment: str(body?.apartment) || undefined,
    postalCode: str(body?.postalCode),
  };
  for (const [k, v] of Object.entries(address)) {
    if (k === "apartment") continue;
    if (!v) {
      return Response.json({ ok: false, error: "All address fields are required." }, { status: 400 });
    }
  }
  const draft = await getOrCreateDraftOrder();
  try {
    await saveDraftShipping(draft.id, address);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not save shipping address." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
