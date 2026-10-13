import { db } from "@/lib/db";
import { sendEmail, appUrl } from "@/lib/email";

/**
 * Notify subscribers when a product comes back in stock.
 * Call this after a product's total stock changes from 0 to > 0.
 * All email failures are swallowed so the admin stock update never breaks.
 */
export async function notifyBackInStock(productId: string): Promise<void> {
  try {
    const alerts = await db.stockAlert.findMany({
      where: { productId, notifiedAt: null },
      select: { id: true, email: true },
    });
    if (alerts.length === 0) return;

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true, slug: true },
    });
    if (!product) return;

    const url = `${appUrl()}/product/${product.slug}`;
    for (const a of alerts) {
      try {
        await sendEmail(
          a.email,
          `🔔 Back in stock: ${product.name} — ZUVO`,
          `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1c1917">Good news! 🎉</h2>
            <p style="color:#444"><strong>${escapeHtml(product.name)}</strong> is back in stock at ZUVO. Hurry — it may sell out again!</p>
            <a href="${url}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:bold">Shop now →</a>
            <p style="margin-top:16px;font-size:12px;color:#999">You received this because you asked to be notified. — Team ZUVO</p>
          </div>`
        );
        await db.stockAlert.update({
          where: { id: a.id },
          data: { notifiedAt: new Date() },
        });
      } catch (e) {
        // one failed email must not block the rest
        console.error(`[stock-alerts] email failed for ${a.email}:`, e);
      }
    }
  } catch (e) {
    console.error("[stock-alerts] notifyBackInStock failed:", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
