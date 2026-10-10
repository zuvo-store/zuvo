export const dynamic = "force-dynamic";

import { getOrCreateDraftOrder, saveDraftContact } from "@/lib/checkout";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : undefined;
  if (!name) return Response.json({ ok: false, error: "Full name is required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: false, error: "A valid email address is required." }, { status: 400 });
  }
  const draft = await getOrCreateDraftOrder();
  try {
    await saveDraftContact(draft.id, { name, email, phone });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not save contact info." },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
