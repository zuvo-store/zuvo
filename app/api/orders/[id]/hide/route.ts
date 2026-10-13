import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** POST /api/orders/[id]/hide — customer dismisses an order from their list (soft hide). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  try {
    const { id } = await params;
    const order = await db.order.findFirst({
      where: { id, userId: me.id },
      select: { id: true },
    });
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    await db.order.update({ where: { id }, data: { hiddenByCustomer: true } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
