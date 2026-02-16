import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
(function logDbConnectionSafe() {
  try {
    const u = new URL(connectionString);
    const user = u.username || "?";
    const host = u.hostname || "?";
    const db = (u.pathname || "").replace(/^\//, "") || "?";
    console.log(`[db] user=${user} host=${host} db=${db}`);
  } catch {
    console.log("[db] user=? host=? db=? (could not parse URL)");
  }
})();

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
