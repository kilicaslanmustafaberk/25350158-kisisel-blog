import assert from "node:assert/strict";

import { createClient } from "@libsql/client";

// Phase 7 HTTP regression. Requires a running server on TEST_BASE_URL backed by a
// disposable local database seeded with tests/phase7-seed.mjs.
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const databaseUrl = process.env.TURSO_DATABASE_URL;
if (!databaseUrl?.startsWith("file:")) throw new Error("Phase 7 HTTP test needs the local file: database used by the server.");
const networkGitHub = process.env.PHASE7_GITHUB_NETWORK === "1";

const checks = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log(`PASS ${name}`);
}
const get = (path) => fetch(`${baseUrl}${path}`, { redirect: "manual" });
const html = async (path) => {
  const response = await get(path);
  assert.equal(response.status, 200, `${path} -> ${response.status}`);
  return response.text();
};

const secrets = [
  "Phase7 Draft Secret", "phase7-draft-secret", "Phase7HiddenSkill", "hidden-phase7@example.com", "Gizli Şehir",
  "hidden-link.example", "Phase7 Taslak Gizli", "phase7-taslak-gizli", "javascript:alert", "github.com/octocat/Hello-World",
];

await check("public routes and admin login still return 200", async () => {
  for (const path of ["/", "/projects", "/blog", "/cv", "/admin/login", "/projects/phase7-public-project", "/projects/phase7-private-repo-project", "/blog/phase7-yayin-yazisi"]) await html(path);
  assert.equal((await get("/projects/phase7-draft-secret")).status, 404);
});

await check("unauthenticated admin is still redirected to login", async () => {
  const response = await get("/admin");
  assert.ok([302, 307].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/admin\/login/);
});

await check("command palette/terminal/footer data contains public data only", async () => {
  for (const path of ["/", "/projects", "/blog", "/cv", "/projects/phase7-public-project"]) {
    const body = await html(path);
    assert.match(body, /Phase7 Public Project/, `${path} lacks published project in command index`);
    assert.match(body, /Phase7VisibleSkill/, `${path} lacks visible skill`);
    assert.match(body, /Phase7 Yayın Yazısı/, `${path} lacks published post`);
    assert.match(body, /linkedin\.com\/in\/phase7-fixture/, `${path} lacks visible link`);
    for (const secret of secrets) assert.ok(!body.includes(secret), `${path} leaked ${secret}`);
  }
});

await check("public shell renders footer, nav active state and palette trigger; admin does not", async () => {
  const projects = await html("/projects");
  assert.match(projects, /class="site-footer"/);
  assert.match(projects, /aria-label="Ana navigasyon"/);
  assert.match(projects, /href="\/projects" aria-current="page"|aria-current="page" href="\/projects"/);
  assert.match(projects, /id="primary-menu-toggle"/);
  const admin = await html("/admin/login");
  assert.match(admin, /class="site-header"/, "admin keeps the shared header");
  assert.doesNotMatch(admin, /command-trigger|terminal-trigger|Phase7 Public Project|Phase7VisibleSkill/, "admin must not render public command data");
});

await check("project case study renders only existing sections and keeps private repo safe", async () => {
  const body = await html("/projects/phase7-public-project");
  for (const id of ["overview", "problem", "solution", "architecture", "gallery", "links"]) assert.match(body, new RegExp(`href="#${id}"`), `nav lacks ${id}`);
  assert.match(body, /<li>Phase7 katman bir<\/li>/);
  assert.match(body, /&lt;script&gt;alert\(&#x27;phase7&#x27;\)&lt;\/script&gt;|&lt;script&gt;alert\('phase7'\)&lt;\/script&gt;/, "architecture text is escaped");
  assert.doesNotMatch(body, /<script>alert\('phase7'\)<\/script>/);
  assert.match(body, /Görseli büyüt: Phase7 pencere görseli/);
  assert.match(body, /href="https:\/\/github.com\/octocat\/Spoon-Knife"[^>]*rel="noopener noreferrer"|rel="noopener noreferrer"[^>]*href="https:\/\/github.com\/octocat\/Spoon-Knife"/);

  const privateBody = await html("/projects/phase7-private-repo-project");
  assert.match(privateBody, /Özel depo/);
  assert.doesNotMatch(privateBody, /Hello-World/);
  assert.doesNotMatch(privateBody, /href="#overview"|id="architecture"|case-nav/, "empty sections/nav are not rendered");
});

await check("CSP was not relaxed for GitHub", async () => {
  const csp = (await get("/")).headers.get("content-security-policy") ?? "";
  assert.match(csp, /connect-src 'self'/);
  assert.doesNotMatch(csp, /github/i);
});

if (networkGitHub) {
  await check("GitHub section uses real public API data and excludes CMS-private repos", async () => {
    const body = await html("/");
    assert.match(body, /id="github"/);
    assert.match(body, /Spoon-Knife/);
    assert.doesNotMatch(body, /github\.com\/octocat\/Hello-World/, "CMS-private repo must not be listed");
    assert.doesNotMatch(body, /github\.com\/octocat\/linguist"/, "forks are excluded");
    assert.match(body, /rel="noopener noreferrer"/);
  });
}

await check("GitHub failure falls back to a plain profile link", async () => {
  const client = createClient({ url: databaseUrl });
  await client.execute("UPDATE social_links SET url = 'https://github.com/phase7-nonexistent-user-zz9q' WHERE id = '71000000-0000-4000-8000-000000000001'");
  client.close();
  const started = Date.now();
  const body = await html("/");
  assert.ok(Date.now() - started < 15000, "landing must not hang on GitHub");
  assert.match(body, /id="github"/);
  assert.ok(body.includes("Çalışmalarımın tamamını GitHub profilimde inceleyebilirsiniz."), "GitHub fallback copy missing");
  assert.match(body, /href="https:\/\/github.com\/phase7-nonexistent-user-zz9q"/);
  assert.doesNotMatch(body, /Public repository<\/dt>/);
});

console.log(`Completed ${checks.length} Phase 7 HTTP checks.`);
