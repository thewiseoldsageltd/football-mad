/**
 * Generate Drizzle migrations from schema (writes to ./drizzle).
 * Uses same env loader as server so DATABASE_URL matches.
 * Use: npm run db:generate
 */
import "../server/load-env";
import { execSync } from "child_process";

const DB_ENV = process.env.DB_ENV;
const DATABASE_URL = process.env.DATABASE_URL;
if (DB_ENV === "staging" && DATABASE_URL) {
  try {
    const u = new URL(DATABASE_URL);
    const host = u.hostname || "?";
    const user = u.username || "?";
    const db = (u.pathname || "").replace(/^\//, "") || "?";
    console.log(`[db:generate] Using DATABASE_URL host=${host} user=${user} db=${db}`);
  } catch {
    // ignore
  }
}

execSync("npx drizzle-kit generate", { stdio: "inherit", env: process.env });
