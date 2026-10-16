import { createClient } from "@libsql/client";

if (!process.env.TURSO_DATABASE_URL) throw new Error("TURSO_DATABASE_URL is required.");
const client = createClient({ url: process.env.TURSO_DATABASE_URL });
await client.execute({
  sql: "INSERT INTO categories (id, name, slug, display_order, is_visible, created_at, updated_at) VALUES (?, ?, ?, 0, 1, unixepoch(), unixepoch())",
  args: ["33333333-3333-4333-8333-333333333333", "Mühendislik", "muhendislik"],
});
await client.execute({
  sql: "INSERT INTO tags (id, name, slug, created_at) VALUES (?, ?, ?, unixepoch())",
  args: ["44444444-4444-4444-8444-444444444444", "nextjs", "nextjs"],
});
client.close();
