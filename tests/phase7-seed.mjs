import { createClient } from "@libsql/client";

// Phase 7 fixture: public + deliberately private/hidden rows so the HTTP test can
// prove that the command palette, terminal data, footer and GitHub section only
// expose public data. Run against a disposable local libSQL database only.
if (!process.env.TURSO_DATABASE_URL?.startsWith("file:")) throw new Error("Phase 7 seed only runs against a local file: database.");
const client = createClient({ url: process.env.TURSO_DATABASE_URL });
const now = Math.floor(Date.now() / 1000);
const run = (sql, args = []) => client.execute({ sql, args });

await run("INSERT INTO profiles (id, full_name, headline, short_bio, email, is_email_visible, location, is_location_visible, available_for_work, created_at, updated_at) VALUES ('primary', 'Phase7 Test Kişi', 'Phase7 geliştirici başlığı', 'Phase7 kısa biyografi metni.', 'hidden-phase7@example.com', 0, 'Gizli Şehir', 0, 1, ?, ?)", [now, now]);

const links = [
  ["71000000-0000-4000-8000-000000000001", "github", "GitHub", process.env.PHASE7_GITHUB_URL ?? "https://github.com/octocat", 0, 1],
  ["71000000-0000-4000-8000-000000000002", "linkedin", "LinkedIn", "https://www.linkedin.com/in/phase7-fixture", 1, 1],
  ["71000000-0000-4000-8000-000000000003", "other", "Gizli bağlantı", "https://hidden-link.example/phase7-invisible", 2, 0],
  ["71000000-0000-4000-8000-000000000004", "other", "Zararlı bağlantı", "javascript:alert(1)", 3, 1],
];
for (const [id, platform, label, url, order, visible] of links) {
  await run("INSERT INTO social_links (id, profile_id, platform, label, url, display_order, is_visible, show_in_cv, created_at, updated_at) VALUES (?, 'primary', ?, ?, ?, ?, ?, ?, ?, ?)", [id, platform, label, url, order, visible, ["github", "linkedin", "website"].includes(platform) ? 1 : 0, now, now]);
}

await run("INSERT INTO skills (id, name, slug, category, display_order, is_visible, created_at, updated_at) VALUES ('72000000-0000-4000-8000-000000000001', 'Phase7VisibleSkill', 'phase7-visible-skill', 'Phase7Kategori', 0, 1, ?, ?)", [now, now]);
await run("INSERT INTO skills (id, name, slug, category, display_order, is_visible, created_at, updated_at) VALUES ('72000000-0000-4000-8000-000000000002', 'Phase7HiddenSkill', 'phase7-hidden-skill', 'Phase7Kategori', 1, 0, ?, ?)", [now, now]);

const projects = [
  {
    id: "73000000-0000-4000-8000-000000000001", title: "Phase7 Public Project", slug: "phase7-public-project", published: 1,
    detailed: "Phase7 genel bakış paragrafı.", problem: "Phase7 problem metni.", solution: "Phase7 çözüm metni.",
    architecture: "Sunucu öncelikli Phase7 mimarisi.\n\n- Phase7 katman bir\n- Phase7 katman iki\n\n<script>alert('phase7')</script>",
    visibility: "public", repo: "https://github.com/octocat/Spoon-Knife", live: "https://example.com/phase7-live",
  },
  {
    id: "73000000-0000-4000-8000-000000000002", title: "Phase7 Private Repo Project", slug: "phase7-private-repo-project", published: 1,
    detailed: null, problem: null, solution: null, architecture: null,
    visibility: "private", repo: "https://github.com/octocat/Hello-World", live: null,
  },
  {
    id: "73000000-0000-4000-8000-000000000003", title: "Phase7 Draft Secret", slug: "phase7-draft-secret", published: 0,
    detailed: "Taslak.", problem: null, solution: null, architecture: null, visibility: "none", repo: null, live: null,
  },
];
for (const project of projects) {
  await run(
    "INSERT INTO projects (id, title, slug, short_description, detailed_description, problem, solution, role, architecture_description, status, project_date, live_url, repository_visibility, repository_url, featured, published, include_in_cv, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Phase7 Rol', ?, 'completed', '2026-04-12', ?, ?, ?, 1, ?, 0, ?, ?)",
    [project.id, project.title, project.slug, `${project.title} kısa açıklaması.`, project.detailed, project.problem, project.solution, project.architecture, project.live, project.visibility, project.repo, project.published, now, now],
  );
}
await run("INSERT INTO project_skills (project_id, skill_id, display_order) VALUES ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 0)");
await run("INSERT INTO project_skills (project_id, skill_id, display_order) VALUES ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000002', 1)");

const gallery = [["/window.svg", "Phase7 pencere görseli"], ["/globe.svg", "Phase7 küre görseli"]];
for (const [index, [url, alt]] of gallery.entries()) {
  const mediaId = `74000000-0000-4000-8000-00000000000${index + 1}`;
  await run("INSERT INTO media (id, storage_key, url, mime_type, size, alt_text, created_at) VALUES (?, ?, ?, 'image/svg+xml', 1, ?, ?)", [mediaId, `phase7/fixture-${index}`, url, alt, now]);
  await run("INSERT INTO project_images (id, project_id, media_id, alt_text, caption, type, display_order, created_at) VALUES (?, '73000000-0000-4000-8000-000000000001', ?, ?, ?, 'gallery', ?, ?)", [`75000000-0000-4000-8000-00000000000${index + 1}`, mediaId, alt, `Phase7 açıklama ${index + 1}`, index, now]);
}

const doc = (text) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
await run("INSERT INTO posts (id, title, slug, excerpt, content, status, published_at, created_at, updated_at) VALUES ('76000000-0000-4000-8000-000000000001', 'Phase7 Yayın Yazısı', 'phase7-yayin-yazisi', 'Phase7 özet.', ?, 'published', ?, ?, ?)", [doc("Phase7 gövde"), now, now, now]);
await run("INSERT INTO posts (id, title, slug, excerpt, content, status, published_at, created_at, updated_at) VALUES ('76000000-0000-4000-8000-000000000002', 'Phase7 Taslak Gizli', 'phase7-taslak-gizli', 'Taslak özet.', ?, 'draft', NULL, ?, ?)", [doc("Taslak"), now, now]);

client.close();
console.log("Phase 7 fixture seeded.");
