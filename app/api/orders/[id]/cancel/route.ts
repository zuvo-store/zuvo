export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, getGuestToken } from "@/lib/auth";
import { sendOrderStatusEmail } from "@/lib/email";

// Statuses a customer may cancel from (order not yet shipped)
const CANCELLABLE = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const where = user
      ? { id, userId: user.id }
      : { id, guestToken: await getGuestToken() };

    const order = await db.order.findFirst({
      where,
      include: { items: true, user: { select: { email: true, name: true } } },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    if (!CANCELLABLE.includes(order.status)) {
      return NextResponse.json(
        { ok: false, error: "Order can no longer be cancelled" },
        { status: 400 }
      );
    }

    const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { ok: false, error: "A cancellation reason is required." },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason?.slice(0, 500) ?? null,
        },
      });

      // Mark any pending payments as cancelled so they don't linger as PENDING
      // in payment reports or on the order page.
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      // Restore stock for each item (tolerant of deleted products/variants)
      for (const item of order.items) {
        try {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.qty } },
            });
          } else if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.qty } },
            });
          }
        } catch {
          /* product/variant deleted — skip stock restore */
        }
      }
    });

    // Notify the customer — fire and forget, never breaks the response.
    const contact = (order.contactJson as Record<string, string> | null) ?? null;
    const customerEmail = order.user?.email ?? order.guestEmail ?? contact?.email ?? null;
    const customerName = order.user?.name ?? order.guestName ?? contact?.name ?? null;
    sendOrderStatusEmail({
      to: customerEmail,
      name: customerName,
      orderNumber: order.orderNumber,
      status: "CANCELLED",
    }).catch((e) =>
      console.error("[zuvo] cancel-order email failed:", e instanceof Error ? e.message : e)
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Cancel order failed:", e);
    return NextResponse.json({ ok: false, error: "Failed to cancel order" }, { status: 500 });
  }
}
