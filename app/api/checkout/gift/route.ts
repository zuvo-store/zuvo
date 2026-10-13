export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder, saveGiftWrap } from "@/lib/checkout";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    giftWrap?: unknown;
    giftMessage?: unknown;
  } | null;
  const giftWrap = body?.giftWrap === true;
  const giftMessage =
    typeof body?.giftMessage === "string" ? body.giftMessage.trim().slice(0, 200) : undefined;
  const draft = await getOrCreateDraftOrder();
  try {
    await saveGiftWrap(draft.id, giftWrap, giftMessage);
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not save gift wrap option." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
