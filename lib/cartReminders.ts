import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";

/**
 * Abandoned-cart tracking.
 *
 * Call after a LOGGED-IN user modifies their cart (add / qty change /
 * remove / clear). Upserts a CartReminder keyed by the user's email with
 * the current item count + subtotal, and resets sentAt to null whenever
 * the cart changes after a reminder was already sent (so a fresh reminder
 * can go out for the new cart state).
 *
 * Fire-and-forget safe: never throws, so it can't break the cart response.
 */
export async function trackCartReminder(): Promise<void> {
  try {
    const user = await getSessionUser();
    if (!user?.email) return; // guests have no email — nothing to remind

    const cart = await getCart();
    const existing = await db.cartReminder.findFirst({
      where: { email: user.email },
      select: { id: true },
    });

    if (existing) {
      await db.cartReminder.update({
        where: { id: existing.id },
        data: {
          userId: user.id,
          itemCount: cart.count,
          totalCents: cart.subtotalCents,
          sentAt: null, // cart changed after send → allow a fresh reminder
        },
      });
    } else {
      await db.cartReminder.create({
        data: {
          email: user.email,
          userId: user.id,
          itemCount: cart.count,
          totalCents: cart.subtotalCents,
        },
      });
    }
  } catch (err) {
    console.error("[cart-reminder] track failed:", err);
  }
}
