import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/chat/messages?conversationId=…[&after=ISO]
 * Returns messages (for polling, pass `after` to get only newer ones).
 * Also marks incoming messages as read.
 */
export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  try {
    const sp = new URL(req.url).searchParams;
    const conversationId = sp.get("conversationId") ?? "";
    const after = sp.get("after");
    if (!conversationId) return NextResponse.json({ ok: false, error: "Missing conversationId" }, { status: 400 });

    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true },
    });
    if (!conv) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const isAdmin = me.role === "ADMIN";
    if (!isAdmin && conv.userId !== me.id) {
      return NextResponse.json({ ok: false, error: "Not allowed" }, { status: 403 });
    }

    const where: Record<string, unknown> = { conversationId };
    if (after) {
      const d = new Date(after);
      if (!isNaN(d.getTime())) where.createdAt = { gt: d };
    }
    const messages = await db.message.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, senderId: true, senderRole: true, body: true, createdAt: true },
    });

    // Mark incoming human messages as read (system notices excluded)
    const oppositeRole = isAdmin ? "CUSTOMER" : "ADMIN";
    await db.message.updateMany({
      where: { conversationId, senderRole: oppositeRole, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true, messages });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
