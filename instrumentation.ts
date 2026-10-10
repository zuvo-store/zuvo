/**
 * Runs once when the Next.js server starts (Node.js runtime only).
 * Serverless hosts (Vercel) have a read-only filesystem except /tmp, so
 * point DATABASE_URL at a /tmp file there — this copies the pre-seeded
 * prisma/seed.db bundle on first boot of each instance. No-op locally.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase } = await import("./lib/db-bootstrap");
    ensureDatabase();
  }
}
