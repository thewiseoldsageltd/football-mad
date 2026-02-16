/**
 * Mark the initial migration as applied without running its SQL (for staging DBs that
 * already have the schema from db:push). Use: npm run db:baseline
 * Requires: DB_ENV=staging, DATABASE_URL with host containing "render.com"
 *
 * Schema from local node_modules (drizzle-orm pg-core/dialect.js):
 * - Schema: "drizzle", Table: "__drizzle_migrations"
 * - Columns: id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
 * Hash from migrator.js: sha256(raw SQL file content).digest("hex"); created_at = journal entry "when".
 */
import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import pg from "pg";

const DB_ENV = process.env.DB_ENV;
const DATABASE_URL = process.env.DATABASE_URL;

if (DB_ENV !== "staging") {
  console.error(
    "[db:baseline] Aborted: DB_ENV must be 'staging'. Current DB_ENV:",
    DB_ENV === undefined ? "(not set)" : `'${DB_ENV}'`,
  );
  process.exit(1);
}

if (!DATABASE_URL || typeof DATABASE_URL !== "string") {
  console.error("[db:baseline] Aborted: DATABASE_URL is not set.");
  process.exit(1);
}

let host = "";
try {
  const u = new URL(DATABASE_URL);
  host = u.hostname || "";
} catch {
  console.error("[db:baseline] Aborted: DATABASE_URL is not a valid URL.");
  process.exit(1);
}

if (!host.includes("render.com")) {
  console.error(
    "[db:baseline] Aborted: DATABASE_URL host must be Render (contain 'render.com'). Got host:",
    host || "(unknown)",
  );
  process.exit(1);
}

const drizzleDir = path.resolve(import.meta.dirname, "..", "drizzle");
const journalPath = path.join(drizzleDir, "meta", "_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
const firstEntry = journal?.entries?.[0];
if (!firstEntry || firstEntry.tag !== "0000_sudden_invisible_woman") {
  console.error("[db:baseline] Aborted: expected first journal entry to be 0000_sudden_invisible_woman.");
  process.exit(1);
}

const sqlPath = path.join(drizzleDir, `${firstEntry.tag}.sql`);
const sqlContent = fs.readFileSync(sqlPath, "utf-8");
const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
const createdAt = firstEntry.when;

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS "drizzle"');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const existing = await client.query(
      'SELECT id FROM "drizzle"."__drizzle_migrations" WHERE hash = $1',
      [hash],
    );
    if (existing.rows.length > 0) {
      console.log("[db:baseline] Migration 0000_sudden_invisible_woman already marked as applied. Done.");
      return;
    }

    await client.query(
      'INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
      [hash, createdAt],
    );
    console.log("[db:baseline] Marked 0000_sudden_invisible_woman as applied (no SQL executed). Done.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("[db:baseline] Error:", err.message);
  process.exit(1);
});
