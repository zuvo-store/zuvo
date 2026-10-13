import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";

/**
 * POST /api/track-view — records an anonymous page view for visitor stats.
 * Body: { path: string }. Skips admin/API paths. Never fails the request.
 */
export async function POST(req: NextRequest) {
  try {
    const { path } = (await req.json().catch(() => ({}))) as { path?: string };
    if (!path || typeof path !== "string" || path.length > 200) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // Don't pollute stats with admin or API traffic.
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const ua = req.headers.get("user-agent") ?? "unknown";
    // Daily-rotating hash: approx unique visitors per day, no raw IP stored.
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = createHash("sha256").update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 32);
    await db.pageView.create({ data: { path, visitorHash } });
    return NextResponse.json({ ok: true });
  } catch {
    // Tracking must never break the page.
    return NextResponse.json({ ok: true });
  }
}
