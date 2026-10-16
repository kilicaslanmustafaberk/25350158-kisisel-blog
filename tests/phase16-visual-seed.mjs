import assert from "node:assert/strict";
import { createClient } from "@libsql/client";

// Optional browser fixture, only after local-regression has finished. Never a live database.
const url = process.env.TURSO_DATABASE_URL;
assert.match(url ?? "", /^file:\.\/\.phase10-\d+\.db$/);
const client = createClient({ url });
try {
  assert.equal((await client.execute("SELECT id FROM profiles WHERE id = 'primary'")).rows.length, 1);
  await client.execute("UPDATE education SET is_visible = 0");
  await client.execute("UPDATE experiences SET is_visible = 0");
  const schools = [
    ["Ankara Üniversitesi Nallıhan Meslek Yüksekokulu", "2024-09-01"],
    ["Kocatepe Mimar Kemal Anadolu Lisesi", "2020-09-01"],
    ["Cebeci Ortaokulu", "2016-09-01"],
  ];
  const now = Math.floor(Date.now() / 1000);
  for (const [index, [institution, date]] of schools.entries()) {
    await client.execute({ sql: "INSERT OR REPLACE INTO education (id, profile_id, institution, program, start_date, is_visible, created_at, updated_at) VALUES (?, 'primary', ?, '', ?, 1, ?, ?)", args: [`phase16-school-${index}`, institution, date, now, now] });
  }
  await client.execute("UPDATE social_links SET is_visible = 0 WHERE platform = 'github' AND url LIKE '%nonexistent%'");
  const post = (await client.execute("SELECT * FROM posts WHERE status = 'published' LIMIT 1")).rows[0];
  if (post) {
    for (const index of [2, 3]) {
      const row = { ...post, id: `phase16-post-${index}`, slug: `phase16-post-${index}`, title: `Phase16 Sıralı Yazı ${index}` };
      const columns = Object.keys(row);
      await client.execute({ sql: `INSERT OR REPLACE INTO posts (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`, args: Object.values(row) });
    }
  }
  console.log("Phase 16 disposable visual fixture: three schools, three posts, public GitHub configuration.");
} finally { client.close(); }
