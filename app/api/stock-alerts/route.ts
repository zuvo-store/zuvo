import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Subscribe an email to back-in-stock alerts for a product (idempotent). */
export async function POST(req: Request) {
  try {
    const { productId, email } = (await req.json()) as {
      productId?: string;
      email?: string;
    };
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (!productId || !EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    const product = await db.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }
    const user = await getSessionUser();
    await db.stockAlert.upsert({
      where: { productId_email: { productId, email: cleanEmail } },
      update: { notifiedAt: null, ...(user ? { userId: user.id } : {}) },
      create: {
        productId,
        email: cleanEmail,
        ...(user ? { userId: user.id } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[stock-alerts] POST failed:", e);
    return NextResponse.json({ ok: false, error: "Failed to subscribe." }, { status: 500 });
  }
}

/** Check whether an email is already subscribed: GET ?productId=&email= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") ?? "";
    const email = (searchParams.get("email") ?? "").trim().toLowerCase();
    if (!productId || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: true, subscribed: false });
    }
    const existing = await db.stockAlert.findUnique({
      where: { productId_email: { productId, email } },
      select: { notifiedAt: true },
    });
    return NextResponse.json({
      ok: true,
      subscribed: !!existing && !existing.notifiedAt,
    });
  } catch (e) {
    console.error("[stock-alerts] GET failed:", e);
    return NextResponse.json({ ok: true, subscribed: false });
  }
}
