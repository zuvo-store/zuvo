"use server";

import { addToCart } from "@/lib/cart";

/** Add to cart (server-side stock check) then let the client navigate to checkout. */
export async function buyNow(
  productId: string,
  variantId: string | null,
  qty: number
): Promise<{ ok: boolean; error?: string; count?: number; loginRequired?: boolean }> {
  return addToCart(productId, variantId, qty);
}
