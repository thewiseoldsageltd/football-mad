/**
 * Migration runner with safety guards: only allows running against Render STAGING.
 * Use: npm run db:migrate
 * Requires: DB_ENV=staging; DATABASE_URL host allowed if render.com, dpg-*, or RENDER env set.
 */
import "../server/load-env";
import { execSync } from "child_process";

const DB_ENV = process.env.DB_ENV;
const DATABASE_URL = process.env.DATABASE_URL;

if (DB_ENV !== "staging") {
  console.error(
    "[db:migrate] Aborted: DB_ENV must be 'staging' to run migrations. Current DB_ENV:",
    DB_ENV === undefined ? "(not set)" : `'${DB_ENV}'`,
  );
  process.exit(1);
}

if (!DATABASE_URL || typeof DATABASE_URL !== "string") {
  console.error("[db:migrate] Aborted: DATABASE_URL is not set.");
  process.exit(1);
}

let host = "";
try {
  const u = new URL(DATABASE_URL);
  host = u.hostname || "";
  if (DB_ENV === "staging") {
    const user = u.username || "?";
    const db = (u.pathname || "").replace(/^\//, "") || "?";
    console.log(`[db:migrate] Using DATABASE_URL host=${host} user=${user} db=${db}`);
  }
} catch {
  console.error("[db:migrate] Aborted: DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const allowedByRenderCom = host.includes("render.com");
const allowedByDpg = host.startsWith("dpg-");
const allowedByRenderEnv = !!process.env.RENDER;

if (allowedByRenderCom) {
  console.log("[db:migrate] Host accepted via render.com");
} else if (allowedByDpg) {
  console.log("[db:migrate] Host accepted via dpg internal");
} else if (allowedByRenderEnv) {
  console.log("[db:migrate] Host accepted via RENDER env");
} else {
  console.error(
    "[db:migrate] Aborted: DATABASE_URL host must be Render (render.com, dpg-*, or RENDER env set). Got host:",
    host || "(unknown)",
  );
  process.exit(1);
}

execSync("npx drizzle-kit migrate", { stdio: "inherit", env: process.env });
