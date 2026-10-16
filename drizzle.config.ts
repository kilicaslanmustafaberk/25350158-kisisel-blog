import { config } from "dotenv";

import { defineConfig } from "drizzle-kit";

// Local Drizzle commands read `.env.local` (then `.env`) so `npm run db:migrate` works without
// manual `$env:` setup. Variables already present in the process environment always win,
// so CI/production credentials passed explicitly are never overridden. Nothing is printed.
config({ path: [".env.local", ".env"], quiet: true });

const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("TURSO_DATABASE_URL is required for Drizzle Kit commands (set it in .env.local for local work).");
}

// drizzle-kit validates authToken as a non-empty optional string. A local `.env.local` usually has
// `TURSO_AUTH_TOKEN=` (empty) for `file:` databases, so an empty value is treated as "not set".
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
    authToken,
  },
  strict: true,
  verbose: true,
});
