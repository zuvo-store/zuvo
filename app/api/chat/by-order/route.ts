import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/chat/by-order?orderId=… — find or create the support conversation for an order. */
export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  try {
    const orderId = new URL(req.url).searchParams.get("orderId") ?? "";
    if (!orderId) return NextResponse.json({ ok: false, error: "Missing orderId" }, { status: 400 });
    const isAdmin = me.role === "ADMIN";
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
    return NextResponse.json({ ok: true, conversationId: conv.id });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
