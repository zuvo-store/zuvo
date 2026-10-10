export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type AddressInput = {
  label?: unknown;
  fullName?: unknown;
  phone?: unknown;
  country?: unknown;
  state?: unknown;
  city?: unknown;
  street?: unknown;
  apartment?: unknown;
  postalCode?: unknown;
  isDefault?: unknown;
};

function parseAddress(body: AddressInput) {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const data = {
    label: str(body.label) || "Home",
    fullName: str(body.fullName),
    phone: str(body.phone) || null,
    country: str(body.country),
    state: str(body.state),
    city: str(body.city),
    street: str(body.street),
    apartment: str(body.apartment) || null,
    postalCode: str(body.postalCode),
  };
  const missing: string[] = [];
  for (const k of ["fullName", "country", "state", "city", "street", "postalCode"] as const) {
    if (!data[k]) missing.push(k);
  }
  return { data, missing };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return Response.json({ ok: true, addresses });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as AddressInput | null;
  const { data, missing } = parseAddress(body ?? {});
  if (missing.length > 0) {
    return Response.json({ ok: false, error: `Missing required fields: ${missing.join(", ")}.` }, { status: 400 });
  }
  const isDefault = body?.isDefault === true;
  const address = await db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...data, userId: user.id, isDefault } });
  });
  return Response.json({ ok: true, address }, { status: 201 });
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as (AddressInput & { id?: unknown }) | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ ok: false, error: "id is required." }, { status: 400 });
  const existing = await db.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return Response.json({ ok: false, error: "Address not found." }, { status: 404 });
  }
  const { data, missing } = parseAddress(body ?? {});
  if (missing.length > 0) {
    return Response.json({ ok: false, error: `Missing required fields: ${missing.join(", ")}.` }, { status: 400 });
  }
  const isDefault = body?.isDefault === true;
  const address = await db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({ where: { userId: user.id, id: { not: id } }, data: { isDefault: false } });
    }
    return tx.address.update({ where: { id }, data: { ...data, isDefault } });
  });
  return Response.json({ ok: true, address });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ ok: false, error: "id is required." }, { status: 400 });
  const existing = await db.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return Response.json({ ok: false, error: "Address not found." }, { status: 404 });
  }
  await db.address.delete({ where: { id } });
  return Response.json({ ok: true });
}
