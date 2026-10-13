import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/admin/carts/send — send a win-back email for an abandoned cart.
 * Admin only. Body: { email, subject, body }
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  try {
    const { email, subject, body } = (await req.json().catch(() => ({}))) as {
      email?: string; subject?: string; body?: string;
    };
    if (!email || !subject || !body) {
      return NextResponse.json({ ok: false, error: "email, subject and body required" }, { status: 400 });
    }
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#ea580c">🛒 ZUVO</h2>
      <p style="white-space:pre-line;color:#333">${body.replace(/</g, "&lt;")}</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuvo-chi.vercel.app"}/cart" style="display:inline-block;background:#ea580c;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:bold">Complete my order →</a></p>
      <p style="color:#999;font-size:12px">You received this because you left items in your ZUVO cart.</p>
    </div>`;
    const result = await sendEmail(email, subject, html);
    return NextResponse.json({ ok: result.sent });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
