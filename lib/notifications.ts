import { db } from "./db";

/** Create an admin notification. Types: ORDER, CHAT, STOCK. */
export async function notifyAdmin(type: "ORDER" | "CHAT" | "STOCK", title: string, body: string, link: string) {
  try {
    // Avoid spamming duplicate unread stock alerts for the same product
    if (type === "STOCK") {
      const dup = await db.notification.findFirst({
        where: { type: "STOCK", title, readAt: null },
        select: { id: true },
      });
      if (dup) return;
    }
    await db.notification.create({
      data: { type, title: title.slice(0, 120), body: body.slice(0, 300), link: link.slice(0, 300) },
    });
    // Keep the table lean — drop read notifications older than 30 days
    await db.notification.deleteMany({
      where: { readAt: { not: null }, createdAt: { lt: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
    });
  } catch {
    /* notifications must never break the main flow */
  }
}
