/**
 * Generate Drizzle migrations from schema (writes to ./drizzle).
 * Loads .env so DATABASE_URL is available when comparing schema to DB.
 * Use: npm run db:generate
 */
import "dotenv/config";
import { execSync } from "child_process";

execSync("npx drizzle-kit generate", { stdio: "inherit", env: process.env });
