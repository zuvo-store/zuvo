import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/chat/conversations
 * Customer: own conversations (with unread count).
 * Admin: all conversations, newest first (with customer + order info + unread count).
 */
export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  try {
    const isAdmin = me.role === "ADMIN";
    const oppositeRole = isAdmin ? "CUSTOMER" : "ADMIN";

    const convs = await db.conversation.findMany({
      where: isAdmin ? {} : { userId: me.id },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { orderNumber: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, senderRole: true },
        },
        _count: {
          select: {
            messages: { where: { senderRole: oppositeRole, readAt: null } },
          },
        },
      },
    });

    const list = convs.map((c) => ({
      id: c.id,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      customerName: c.user.name,
      customerEmail: c.user.email,
      orderNumber: c.order?.orderNumber ?? null,
      preview: c.messages[0]?.body.slice(0, 80) ?? "",
      previewAt: c.messages[0]?.createdAt ?? c.createdAt,
      unread: c._count.messages,
    }));
    const totalUnread = list.reduce((s, c) => s + c.unread, 0);
    return NextResponse.json({ ok: true, conversations: list, totalUnread });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
