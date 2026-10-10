import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/auth";

/** Best-effort client IP for rate limiting. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Auth rate limiting: 10 attempts per 10 minutes per action+IP.
 * Returns a 429 JSON response when limited, or null to continue.
 */
export function rateLimitOr429(req: NextRequest, action: string): NextResponse | null {
  const r = rateLimit(`auth:${action}:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (r.ok) return null;
  return NextResponse.json(
    { ok: false, error: `Too many attempts. Please try again in ${r.retryAfterSec} seconds.` },
    { status: 429 }
  );
}

/** Parse a JSON body safely; returns null when the body is not a JSON object. */
export async function readJson(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const v: unknown = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function verifyEmailHtml(name: string, link: string): string {
  return `<div style="font-family:sans-serif;max-width:560px">
    <h2>Welcome to ZUVO, ${name}!</h2>
    <p>Please verify your email address by clicking the link below (valid for 24 hours):</p>
    <p><a href="${link}">${link}</a></p>
    <p style="color:#71717a">ZUVO is a demo marketplace. No real money or emails are involved.</p>
  </div>`;
}

export function resetEmailHtml(name: string, link: string): string {
  return `<div style="font-family:sans-serif;max-width:560px">
    <h2>Reset your ZUVO password</h2>
    <p>Hi ${name}, click the link below to set a new password (valid for 60 minutes):</p>
    <p><a href="${link}">${link}</a></p>
    <p style="color:#71717a">If you did not request this, you can safely ignore this email.</p>
  </div>`;
}
