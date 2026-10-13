export const dynamic = "force-dynamic";

import { getCart, addToCart, setCartQty, removeCartItem, clearCart } from "@/lib/cart";
import { trackCartReminder } from "@/lib/cartReminders";

export async function GET() {
  const cart = await getCart();
  return Response.json({ ok: true, ...cart });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    productId?: unknown;
    variantId?: unknown;
    qty?: unknown;
  } | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return Response.json({ ok: false, error: "productId is required." }, { status: 400 });
  }
  const variantId = typeof body?.variantId === "string" && body.variantId ? body.variantId : null;
  const qty = Number(body?.qty ?? 1);
  const result = await addToCart(productId, variantId, qty);
  if (!result.ok) {
    const status = result.loginRequired ? 401 : 400;
    return Response.json(
      { ok: false, error: result.error ?? "Could not add to cart.", loginRequired: result.loginRequired ?? false },
      { status }
    );
  }
  await trackCartReminder();
  return Response.json({ ok: true, count: result.count });
}

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as { itemId?: unknown; qty?: unknown } | null;
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  if (!itemId) {
    return Response.json({ ok: false, error: "itemId is required." }, { status: 400 });
  }
  const result = await setCartQty(itemId, Number(body?.qty));
  if (!result.ok) {
    return Response.json({ ok: false, error: result.error ?? "Could not update quantity." }, { status: 400 });
  }
  await trackCartReminder();
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { itemId?: unknown; clear?: unknown } | null;
  if (body?.clear === true) {
    await clearCart();
    await trackCartReminder();
    return Response.json({ ok: true, cleared: true });
  }
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  if (!itemId) {
    return Response.json({ ok: false, error: "itemId is required." }, { status: 400 });
  }
  const result = await removeCartItem(itemId);
  if (!result.ok) {
    return Response.json({ ok: false, error: "Item not found." }, { status: 404 });
  }
  await trackCartReminder();
  return Response.json({ ok: true });
}
