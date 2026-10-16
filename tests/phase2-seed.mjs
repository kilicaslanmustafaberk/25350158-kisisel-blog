import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL is required.");
const client = createClient({ url: process.env.TURSO_DATABASE_URL });
await client.execute({
  sql: "INSERT INTO skills (id, name, slug, category, display_order, is_visible, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 1, unixepoch(), unixepoch())",
  args: ["11111111-1111-4111-8111-111111111111", "TypeScript", "typescript", "Frontend"],
});
client.close();
