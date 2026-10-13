import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * POST /api/chat/send — send a chat message.
 * Body: { body, orderId? } or { body, conversationId? }
 * Customer: creates/finds conversation for their order. Admin: replies in any conversation.
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  try {
    const { body, orderId, conversationId } = (await req.json().catch(() => ({}))) as {
      body?: string; orderId?: string; conversationId?: string;
    };
    const text = (body ?? "").trim().slice(0, 2000);
    if (!text) return NextResponse.json({ ok: false, error: "Message is empty" }, { status: 400 });

    const isAdmin = me.role === "ADMIN";
    let convId = conversationId;

    if (!convId && orderId) {
      // Find or create conversation for this order
      const order = await db.order.findFirst({
        where: isAdmin ? { id: orderId } : { id: orderId, userId: me.id },
        select: { id: true, userId: true },
      });
      if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
      let conv = await db.conversation.findFirst({
        where: { orderId, userId: order.userId ?? me.id },
        select: { id: true },
      });
      if (!conv) {
        conv = await db.conversation.create({
          data: { userId: order.userId ?? me.id, orderId, status: "OPEN" },
          select: { id: true },
        });
      }
      convId = conv.id;
    }

    if (!convId) return NextResponse.json({ ok: false, error: "No conversation" }, { status: 400 });

    const conv = await db.conversation.findUnique({
      where: { id: convId },
      select: { id: true, userId: true },
    });
    if (!conv) return NextResponse.json({ ok: false, error: "Conversation not found" }, { status: 404 });
    if (!isAdmin && conv.userId !== me.id) {
      return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
    }

    const msg = await db.message.create({
      data: {
        conversationId: convId,
        senderId: me.id,
        senderRole: isAdmin ? "ADMIN" : "CUSTOMER",
        body: text,
      },
    });

    // Auto-reply: first customer message in a conversation gets an instant acknowledgment
    if (!isAdmin) {
      const hasAuto = await db.message.findFirst({
        where: { conversationId: convId, senderRole: "SYSTEM" },
        select: { id: true },
      });
      if (!hasAuto) {
        await db.message.create({
          data: {
            conversationId: convId,
            senderId: me.id,
            senderRole: "SYSTEM",
            body: "Thanks for reaching out! 🙏 Please wait — our support team will reply here soon, usually within a few hours.",
          },
        });
      }
    }

    await db.conversation.update({
      where: { id: convId },
      data: { lastMessageAt: new Date(), status: "OPEN" },
    });

    // Notify admin of new customer messages
    if (!isAdmin) {
      const { notifyAdmin } = await import("@/lib/notifications");
      const customer = await db.user.findUnique({ where: { id: me.id }, select: { name: true } });
      const ord = await db.conversation.findUnique({
        where: { id: convId },
        select: { order: { select: { orderNumber: true } } },
      });
      notifyAdmin(
        "CHAT",
        `💬 ${customer?.name ?? "Customer"} sent a message`,
        ord?.order?.orderNumber ? `Order ${ord.order.orderNumber} · ${text.slice(0, 60)}` : text.slice(0, 80),
        `/admin/inbox`
      );
    }

    return NextResponse.json({ ok: true, message: { id: msg.id, createdAt: msg.createdAt } });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
