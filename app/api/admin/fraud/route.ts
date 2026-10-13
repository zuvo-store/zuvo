import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { scoreRecentOrders } from "@/lib/fraud";

/** GET /api/admin/fraud — risk-scored recent orders. Admin only. */
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const orders = await scoreRecentOrders(50);
    return NextResponse.json({ ok: true, orders });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
