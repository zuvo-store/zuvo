import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const POINTS_PER_TAP_MIN = 5;
const POINTS_PER_TAP_MAX = 15;
const TAP_COOLDOWN_MS = 2000;
const DAILY_TAP_CAP = 2000; // max points earnable from taps per day

// In-memory cooldown (per serverless instance; DB log is the source of truth for daily cap)
const lastTap = new Map<string, number>();

/**
 * POST /api/zuzu/tap — earn ZUZU points by tapping Zuzu.
 * Anti-spam: 2s cooldown + 2000 pts/day cap. 1000 pts = $1.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Login to earn points." }, { status: 401 });
  }

  // Cooldown check
  const now = Date.now();
  const last = lastTap.get(user.id) ?? 0;
  if (now - last < TAP_COOLDOWN_MS) {
    return NextResponse.json({ ok: false, error: "Too fast! Slow down." }, { status: 429 });
  }

  try {
    // Daily cap check
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const today = await db.zuzuPointsLog.aggregate({
      where: { userId: user.id, kind: "TAP", createdAt: { gte: dayStart } },
      _sum: { amount: true },
    });
    const earnedToday = today._sum.amount ?? 0;
    if (earnedToday >= DAILY_TAP_CAP) {
      return NextResponse.json(
        { ok: false, error: "Daily limit reached! Come back tomorrow. 🎉", dailyCap: true },
        { status: 429 }
      );
    }

    const points =
      POINTS_PER_TAP_MIN + Math.floor(Math.random() * (POINTS_PER_TAP_MAX - POINTS_PER_TAP_MIN + 1));

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        zuzuPoints: { increment: points },
        zuzuPointsLogs: { create: { amount: points, kind: "TAP", note: "Tapped Zuzu" } },
      },
      select: { zuzuPoints: true },
    });

    lastTap.set(user.id, now);
    return NextResponse.json({ ok: true, earned: points, balance: updated.zuzuPoints });
  } catch (e) {
    console.error("zuzu/tap error", e);
    return NextResponse.json({ ok: false, error: "Could not add points." }, { status: 500 });
  }
}

/** GET /api/zuzu/tap — current balance */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, balance: 0 }, { status: 401 });
  const u = await db.user.findUnique({ where: { id: user.id }, select: { zuzuPoints: true } });
  return NextResponse.json({ ok: true, balance: u?.zuzuPoints ?? 0 });
}
