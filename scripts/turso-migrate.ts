/**
 * Applies the Prisma SQLite migration to a fresh Turso database, then verifies.
 * Usage: TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx scripts/turso-migrate.ts
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

const HERE = dirname(fileURLToPath(import.meta.url));
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
  process.exit(1);
}

const sql = readFileSync(
  join(HERE, "..", "prisma", "migrations", "20261010215210_init", "migration.sql"),
  "utf8"
);
// Split on semicolons; the migration has no triggers/procedures with inner semicolons.
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

const client = createClient({ url, authToken });
let applied = 0;
for (const stmt of statements) {
  await client.execute(stmt);
  applied++;
}
console.log(`Applied ${applied} statements.`);

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name"
);
console.log("Tables:", tables.rows.map((r) => r.name).join(", "));
client.close();
