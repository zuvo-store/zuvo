import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";
import { isEmail, normalizeEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KEY = "newsletter_emails";

export async function POST(req: Request) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  let emails: string[] = [];
  const raw = await getSetting(KEY, "");
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) emails = parsed.filter((x): x is string => typeof x === "string");
    } catch {
      emails = [];
    }
  }
  if (!emails.includes(email)) {
    emails.push(email);
    await setSetting(KEY, JSON.stringify(emails));
  }

  return NextResponse.json({ ok: true });
}
