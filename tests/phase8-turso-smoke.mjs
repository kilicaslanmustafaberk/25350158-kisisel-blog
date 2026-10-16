import assert from "node:assert/strict";
import fs from "node:fs";

import { createClient } from "@libsql/client";

// Phase 8 read-only Turso smoke test (no writes):
//   vercel env run -e production -- node tests/phase8-turso-smoke.mjs
// Prints only counts/booleans — never the URL or token.

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || url.startsWith("file:")) throw new Error("A remote TURSO_DATABASE_URL is required.");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required.");

const client = createClient({ url, authToken });
const results = [];
async function check(name, run) {
  try {
    const note = await run();
    results.push(true);
    console.log(`PASS ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    results.push(false);
    console.log(`FAIL ${name} — ${error instanceof Error ? error.name : "error"}`);
  }
}

await check("connection and SELECT", async () => {
  const result = await client.execute("SELECT 1 AS ok");
  assert.equal(Number(result.rows[0].ok), 1);
  return `protocol ${new URL(url).protocol}`;
});

const localMigrations = fs.readdirSync("drizzle", { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
await check("migration journal matches the repository", async () => {
  const tables = (await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%migrations%'")).rows.map((row) => String(row.name));
  assert.ok(tables.length > 0, "no migration table");
  const applied = (await client.execute(`SELECT count(*) AS n FROM "${tables[0]}"`)).rows[0].n;
  assert.equal(Number(applied), localMigrations.length, `applied ${applied}, repository ${localMigrations.length}`);
  return `${tables[0]}: ${applied}/${localMigrations.length} applied`;
});

await check("expected application tables exist", async () => {
  const names = new Set((await client.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map((row) => String(row.name)));
  for (const table of ["users", "sessions", "accounts", "rate_limits", "profiles", "social_links", "projects", "project_images", "media", "posts", "skills", "education", "experiences", "cv_settings"]) {
    assert.ok(names.has(table), `missing ${table}`);
  }
  return `${names.size} tables`;
});

await check("foreign keys enabled and no violations", async () => {
  const enabled = Number((await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys ?? 0);
  const violations = (await client.execute("PRAGMA foreign_key_check")).rows.length;
  assert.equal(violations, 0);
  return `foreign_keys=${enabled}, violations=${violations}`;
});

await check("single admin account exists", async () => {
  const users = Number((await client.execute("SELECT count(*) AS n FROM users")).rows[0].n);
  const admins = Number((await client.execute("SELECT count(*) AS n FROM users WHERE role LIKE '%admin%'")).rows[0].n);
  assert.equal(admins, 1);
  return `users=${users}, admins=${admins}`;
});

await check("content row counts (read-only)", async () => {
  const counts = [];
  for (const table of ["profiles", "social_links", "projects", "posts", "skills", "media"]) {
    counts.push(`${table}=${Number((await client.execute(`SELECT count(*) AS n FROM ${table}`)).rows[0].n)}`);
  }
  return counts.join(" ");
});

client.close();
const failed = results.filter((ok) => !ok).length;
console.log(`Completed ${results.length} Turso smoke checks, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
