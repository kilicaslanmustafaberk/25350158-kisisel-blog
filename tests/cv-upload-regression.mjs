import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@libsql/client";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";

import { startR2Mock } from "./r2-mock-server.mjs";

// 1.9.0 uploaded professional CV regression with a local S3-compatible mock.
// Explicit disposable database; never touches local.db, .env.local or real R2.
// Run alone (it shares the isolated .next-test build directory with local-regression).
const database = `file:./.phase19-${Date.now()}.db`;
const base = "http://localhost:3101";
const mock = await startR2Mock({ bucket: "test-bucket" });
const env = {
  ...process.env,
  TEST_NEXT_ISOLATED: "1",
  TURSO_DATABASE_URL: database,
  TURSO_AUTH_TOKEN: "",
  BETTER_AUTH_URL: base,
  BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
  TEST_BASE_URL: base,
  TEST_ADMIN_EMAIL: "phase19@example.com",
  TEST_ADMIN_PASSWORD: randomBytes(24).toString("hex"),
  GITHUB_TOKEN: "",
  GITHUB_USERNAME: "",
  R2_ACCOUNT_ID: "phase19testaccount",
  R2_ACCESS_KEY_ID: `test-${randomBytes(12).toString("hex")}`,
  R2_SECRET_ACCESS_KEY: randomBytes(24).toString("hex"),
  R2_BUCKET_NAME: mock.bucket,
  R2_PUBLIC_BASE_URL: "https://media.test.invalid",
  R2_TEST_ENDPOINT: mock.origin,
  TEST_R2_MOCK_URL: mock.origin,
};
const secrets = [env.TEST_ADMIN_PASSWORD, env.BETTER_AUTH_SECRET, env.R2_SECRET_ACCESS_KEY, env.R2_ACCESS_KEY_ID];
const redact = (text) => secrets.reduce((value, secret) => value.replaceAll(secret, "[redacted]"), text);

const client = createClient({ url: database });
await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
client.close();

const admin = spawnSync(process.execPath, ["node_modules/auth/dist/index.mjs", "create-admin", "--config", "./src/server/auth.cli.ts", "--email", env.TEST_ADMIN_EMAIL, "--password", env.TEST_ADMIN_PASSWORD, "--name", "Test Admin"], { env, encoding: "utf8" });
if (admin.status !== 0) throw new Error("admin bootstrap failed (details suppressed)");

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3101"], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
server.stderr.on("data", (data) => process.stderr.write(redact(data.toString())));
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + "/admin/login")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["tests/phase19-http.mjs"], { env, stdio: "inherit", windowsHide: true });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error("phase19-http (mock R2) failed")));
  });
  console.log("CV upload regression complete; disposable DB retained (gitignored), mock storage discarded.");
} finally {
  server.kill();
  await mock.close();
}
