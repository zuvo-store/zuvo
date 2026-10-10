export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSessionUser, isEmail, rateLimit } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** POST /api/contact — {name, email, message}. Stored as an AuditLog ContactMessage. */
export async function POST(req: Request) {
  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name) return NextResponse.json({ ok: false, error: "Please tell us your name." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  if (message.length < 10) {
    return NextResponse.json({ ok: false, error: "Message must be at least 10 characters." }, { status: 400 });
  }
  if (message.length > 3000) {
    return NextResponse.json({ ok: false, error: "Message must be 3000 characters or less." }, { status: 400 });
  }

  const rl = rateLimit(`contact:${email}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many messages. Please try again in ${rl.retryAfterSec} seconds.` },
      { status: 429 }
    );
  }

  const user = await getSessionUser();
  await audit("contact.message", {
    actorId: user?.id,
    entity: "ContactMessage",
    meta: { name, email, message, at: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
