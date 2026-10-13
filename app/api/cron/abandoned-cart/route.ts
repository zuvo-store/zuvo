import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, appUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const BATCH_LIMIT = 50;

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Abandoned-cart reminder cron (every 6h via vercel.json).
 *
 * Finds CartReminders that were never sent (sentAt = null), last touched
 * more than 2 hours ago, and still have items — then emails the shopper a
 * "come back to your cart" nudge. Skips anyone who placed an order after
 * the cart was last touched. Max 50 emails per run.
 */
export async function GET(req: Request) {
  // Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[abandoned-cart] CRON_SECRET not set — cron endpoint is unprotected");
  }

  const cutoff = new Date(Date.now() - TWO_HOURS_MS);

  const reminders = await db.cartReminder.findMany({
    where: { sentAt: null, updatedAt: { lt: cutoff }, itemCount: { gt: 0 } },
    orderBy: { updatedAt: "asc" },
    take: BATCH_LIMIT,
  });

  let sent = 0;
  let skippedOrdered = 0;
  let failed = 0;

  for (const r of reminders) {
    // Skip if they placed an order AFTER the cart was last touched.
    // DRAFT orders are in-progress checkouts, not placed orders — exclude them.
    const recentOrder = await db.order.findFirst({
      where: {
        AND: [
          {
            OR: [
              ...(r.userId ? [{ userId: r.userId }] : []),
              { guestEmail: r.email },
            ],
          },
          { createdAt: { gt: r.updatedAt } },
          { status: { not: "DRAFT" } },
        ],
      },
      select: { id: true },
    });

    if (recentOrder) {
      skippedOrdered++;
      // Mark handled so we don't re-check this reminder every run.
      await db.cartReminder.update({ where: { id: r.id }, data: { sentAt: new Date() } });
      continue;
    }

    const subject = "You left items in your cart! 🛒";
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff7ed;border-radius:16px">
        <h2 style="color:#ea580c;margin:0 0 8px">You left ${r.itemCount} item${r.itemCount === 1 ? "" : "s"} in your cart! 🛒</h2>
        <p style="color:#444;font-size:15px;line-height:1.6">
          Hey! We noticed you left <b>${money(r.totalCents)}</b> worth of goodies in your ZUVO cart.
          They're still waiting for you — but stock moves fast! 🏃
        </p>
        <a href="${appUrl()}/cart" style="display:inline-block;margin-top:12px;padding:12px 28px;background:#ea580c;color:#fff;text-decoration:none;font-weight:bold;border-radius:999px">
          Back to my cart →
        </a>
        <p style="color:#999;font-size:12px;margin-top:20px">
          ZUVO — Discover More. Shop Smarter.<br>
          You're getting this because you left items in your cart on ZUVO.
        </p>
      </div>
    `;

    try {
      await sendEmail(r.email, subject, html);
    } catch (err) {
      failed++;
      console.error(`[abandoned-cart] send failed for ${r.email}:`, err);
      continue; // don't mark sentAt — retry next run
    }

    await db.cartReminder.update({ where: { id: r.id }, data: { sentAt: new Date() } });
    sent++;
  }

  return NextResponse.json({
    ok: true,
    checked: reminders.length,
    sent,
    skippedOrdered,
    failed,
  });
}
