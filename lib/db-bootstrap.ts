import fs from "node:fs";
import path from "node:path";

/**
 * Serverless-safe SQLite bootstrap (e.g. Vercel).
 *
 * Serverless filesystems are read-only except /tmp, so for hosted deploys
 * point DATABASE_URL at a /tmp file (e.g. file:/tmp/zuvo.db). On first boot
 * of each instance we copy the pre-seeded bundle (prisma/seed.db, shipped
 * with the deployment) there. Local development is untouched because the
 * local dev.db already exists.
 *
 * Safe to call on every import: it is a no-op when the target file exists.
 */
export function ensureDatabase(): void {
  try {
    if (process.env.SKIP_DB_BOOTSTRAP === "1") return;
    const url = process.env.DATABASE_URL ?? "";
    const m = url.match(/^file:(.+)$/);
    if (!m) return;
    const target = path.resolve(m[1]);
    if (fs.existsSync(target)) return;

    const candidates = [
      path.join(process.cwd(), "prisma", "seed.db"),
      path.join(process.cwd(), "prisma", "dev.db"),
    ];
    const src = candidates.find((p) => fs.existsSync(p));
    if (!src) {
      console.warn(`[db-bootstrap] target ${target} missing and no seed bundle found`);
      return;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
    console.log(`[db-bootstrap] copied seed database -> ${target}`);
  } catch (err) {
    console.warn("[db-bootstrap] failed:", err);
  }
}
