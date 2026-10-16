import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";

// Explicit disposable database; never touches local.db or .env.local.
const database = `file:./.phase10-${Date.now()}.db`;
const base = "http://localhost:3100";
process.env.TEST_NEXT_ISOLATED = "1";
const env = { ...process.env, TURSO_DATABASE_URL: database, TURSO_AUTH_TOKEN: "", BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), TEST_BASE_URL: base, TEST_ADMIN_EMAIL: "phase10@example.com", TEST_ADMIN_PASSWORD: randomBytes(24).toString("hex"), GITHUB_TOKEN: "", GITHUB_USERNAME: "", R2_ACCOUNT_ID: "", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "", R2_BUCKET_NAME: "", R2_PUBLIC_BASE_URL: "", TEST_R2_UNCONFIGURED: "1", TEST_PDF_OUTPUT: process.env.TEST_PDF_OUTPUT };
const client = createClient({ url: database });
await migrate(drizzle({ client }), { migrationsFolder: "drizzle" }); client.close();
const run = (file, args = [], quiet = false) => {
  const result = spawnSync(process.execPath, [file, ...args], { env, encoding: "utf8" });
  if (!quiet) process.stdout.write(result.stdout ?? "");
  if (result.status !== 0) { if (!quiet) process.stderr.write(result.stderr ?? ""); throw new Error(`${file} failed (details suppressed when credentials involved)`); }
};
run("node_modules/auth/dist/index.mjs", ["create-admin", "--config", "./src/server/auth.cli.ts", "--email", env.TEST_ADMIN_EMAIL, "--password", env.TEST_ADMIN_PASSWORD, "--name", "Test Admin"], true);
run("tests/phase2-seed.mjs"); run("tests/phase3-seed.mjs");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3100"], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
server.stderr.on("data", (data) => { let message = data.toString(); for (const secret of [env.TEST_ADMIN_PASSWORD, env.BETTER_AUTH_SECRET]) message = message.replaceAll(secret, "[redacted]"); process.stderr.write(message); });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + "/admin/login")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  for (const file of (process.env.TEST_GROUPS?.split(",") ?? ["phase5-http", "phase7-http", "phase2-http", "phase3-http", "phase4-http", "phase8-social-http", "phase10-http", "phase11-http", "phase13-http", "phase14-http", "phase15-http", "phase16-http", "phase17-http", "phase18-http", "phase19-http"])) {
    if (file === "phase7-http") run("tests/phase7-seed.mjs");
    // Better Auth uses a sliding sign-in window; keep the actual limiter intact.
    if (file === "phase10-http" && !process.env.TEST_GROUPS) {
      console.log("Respecting sign-in rate limit before Phase 10.");
      await new Promise((resolve) => setTimeout(resolve, 31000));
      await new Promise((resolve) => setTimeout(resolve, 31000));
    }
    await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [`tests/${file}.mjs`], { env, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${file} failed`)));
    });
    await new Promise((resolve) => setTimeout(resolve, 13000));
  }
  console.log("Local regression complete; disposable DB retained (gitignored).");
  if (process.env.TEST_KEEP_SERVER === "1") { console.log("Visual fixture server ready on localhost:3100."); await new Promise(() => {}); }
} finally { server.kill(); }
