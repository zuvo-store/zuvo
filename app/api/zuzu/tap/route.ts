import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const POINTS_PER_TAP_MIN = 5;
const POINTS_PER_TAP_MAX = 15;
const TAP_COOLDOWN_MS = 3000; // 3s DB-backed cooldown (was 2s in-memory)
const DAILY_TAP_CAP = 1000; // max points earnable from taps per day (was 2000)
const DIMINISH_AFTER = 50; // taps after which rewards diminish

/**
 * POST /api/zuzu/tap — earn ZUZU points by tapping Zuzu.
 *
 * Anti-abuse (auto-clicker proof):
 * 1. Login + verified email required (blocks mass fake accounts)
 * 2. DB-backed 3s cooldown (can't bypass via multiple serverless instances)
 * 3. Atomic daily cap — 1000 pts/day max from taps
 * 4. Diminishing returns — after 50 taps/day, rewards drop to 1-3 pts
 * 5. All checks in a single DB transaction (no race conditions)
 *
 * 1000 pts = $1.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Login to earn points." }, { status: 401 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Re-fetch user inside transaction for fresh data
      const u = await tx.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true, lastZuzuTapAt: true },
      });
      if (!u) throw new Error("no-user");

      // 1. Verified email required
      if (!u.emailVerified) {
        return { ok: false as const, error: "Verify your email to earn points.", status: 403 };
      }

      const now = new Date();

      // 2. DB-backed cooldown
      if (u.lastZuzuTapAt && now.getTime() - u.lastZuzuTapAt.getTime() < TAP_COOLDOWN_MS) {
        return { ok: false as const, error: "Too fast! Slow down.", status: 429 };
      }

      // 3. Daily tap count + points (atomic within transaction)
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const todayAgg = await tx.zuzuPointsLog.aggregate({
        where: { userId: user.id, kind: "TAP", createdAt: { gte: dayStart } },
        _sum: { amount: true },
        _count: { id: true },
      });
      const earnedToday = todayAgg._sum.amount ?? 0;
      const tapsToday = todayAgg._count.id ?? 0;

      if (earnedToday >= DAILY_TAP_CAP) {
        return {
          ok: false as const,
          error: "Daily limit reached! Come back tomorrow. 🎉",
          status: 429,
          dailyCap: true,
        };
      }

      // 4. Diminishing returns — heavy tappers earn less per tap
      const diminished = tapsToday >= DIMINISH_AFTER;
      const min = diminished ? 1 : POINTS_PER_TAP_MIN;
      const max = diminished ? 3 : POINTS_PER_TAP_MAX;
      let points = min + Math.floor(Math.random() * (max - min + 1));

      // Don't exceed the daily cap
      if (earnedToday + points > DAILY_TAP_CAP) {
        points = DAILY_TAP_CAP - earnedToday;
      }
      if (points <= 0) {
        return {
          ok: false as const,
          error: "Daily limit reached! Come back tomorrow. 🎉",
          status: 429,
          dailyCap: true,
        };
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          zuzuPoints: { increment: points },
          lastZuzuTapAt: now,
          zuzuPointsLogs: { create: { amount: points, kind: "TAP", note: "Tapped Zuzu" } },
        },
        select: { zuzuPoints: true },
      });

      return { ok: true as const, earned: points, balance: updated.zuzuPoints, diminished };
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.status });
    }
    return NextResponse.json(result);
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
