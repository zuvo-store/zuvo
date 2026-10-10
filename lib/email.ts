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
