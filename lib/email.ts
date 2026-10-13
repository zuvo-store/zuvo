import nodemailer from "nodemailer";

/**
 * Email sending. In this demo, SMTP is optional: when SMTP env vars are not
 * configured, sending is skipped (logged) and the caller shows the token link
 * inline labeled DEMO ONLY so every flow stays testable end-to-end.
 */
export function emailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; demo: boolean }> {
  if (!emailConfigured()) {
    console.log(`[zuvo demo-email] to=${to} subject=${subject}`);
    return { sent: false, demo: true };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to, subject, html });
  return { sent: true, demo: false };
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/* ------------------------------------------------------------------ */
/* Order status emails — sent to customers after an order status change */
/* ------------------------------------------------------------------ */

const ORDER_STATUS_COPY: Record<string, { emoji: string; headline: string; message: string }> = {
  CONFIRMED: {
    emoji: "✅",
    headline: "Order confirmed!",
    message: "We received your order and it's being prepared. We'll let you know the moment it ships!",
  },
  PROCESSING: {
    emoji: "📦",
    headline: "We're packing your order!",
    message: "Good news — our team is packing your items with care right now. Almost on its way!",
  },
  SHIPPED: {
    emoji: "🚚",
    headline: "Your order is on the way!",
    message: "Your package has shipped and is heading to you. Keep an eye on the door! 🚚",
  },
  DELIVERED: {
    emoji: "🎉",
    headline: "Delivered! Enjoy!",
    message: "Your order has been delivered! Enjoy your goodies — and thanks for shopping with ZUVO! 🎉",
  },
  CANCELLED: {
    emoji: "❌",
    headline: "Order cancelled",
    message: "Your order has been cancelled as requested. If this was a mistake, just place a new order — we're here to help!",
  },
  REFUNDED: {
    emoji: "💸",
    headline: "Refund processed",
    message: "Your refund has been processed. Depending on your payment method, it may take a few days to appear.",
  },
};

/** Friendly display name for an order status, e.g. "CONFIRMED" -> "Confirmed". */
export function prettyOrderStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Sends a status-change email to the customer. No-op for statuses without
 * customer-facing copy or when no recipient email is available.
 */
export async function sendOrderStatusEmail(opts: {
  to?: string | null;
  name?: string | null;
  orderNumber: string;
  status: string;
}): Promise<void> {
  const copy = ORDER_STATUS_COPY[opts.status];
  if (!copy || !opts.to) return;
  const pretty = prettyOrderStatus(opts.status);
  const subject = `Your ZUVO order ${opts.orderNumber} is now ${pretty.toUpperCase()} ${copy.emoji}`;
  const trackUrl = `${appUrl()}/track-order?order=${encodeURIComponent(opts.orderNumber)}`;
  const greeting = opts.name ? `Hi ${opts.name},` : "Hi there,";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #fde6c8;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:24px;text-align:center;color:#fff">
        <div style="font-size:32px">${copy.emoji}</div>
        <h1 style="margin:8px 0 0;font-size:22px">${copy.headline}</h1>
        <p style="margin:6px 0 0;font-size:14px;opacity:.9">Order <b>${opts.orderNumber}</b></p>
      </div>
      <div style="padding:24px;color:#3f3f46;font-size:14px;line-height:1.6">
        <p>${greeting}</p>
        <p>${copy.message}</p>
        <p style="text-align:center;margin:24px 0">
          <a href="${trackUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:999px">Track Your Order →</a>
        </p>
        <p style="color:#a1a1aa;font-size:12px">Order status: <b>${pretty}</b><br/>You can also track anytime at ${appUrl()}/track-order</p>
      </div>
      <div style="background:#fafaf9;padding:16px;text-align:center;color:#a1a1aa;font-size:12px">
        ZUVO — Discover More. Shop Smarter. 🧡
      </div>
    </div>`;
  await sendEmail(opts.to, subject, html);
}
