import assert from "node:assert/strict";

// Phase 8 social links CMS integration test. Run only against a disposable local
// server/database; credentials come from the environment and are never printed.
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.");
const networkGitHub = process.env.PHASE8_GITHUB_NETWORK === "1";

const checks = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log(`PASS ${name}`);
}
async function request(path, options = {}, cookie = "") {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: { Origin: baseUrl, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
}
const json = (value) => JSON.stringify(value);
const someId = "11111111-1111-4111-8111-111111111111";
const github = { platform: "github", label: "GitHub", url: "https://github.com/octocat", isVisible: true };

await check("unauthenticated social create/update/delete/move are 401", async () => {
  assert.equal((await request("/api/admin/social-links", { method: "POST", body: json(github) })).status, 401);
  assert.equal((await request(`/api/admin/social-links/${someId}`, { method: "PATCH", body: json(github) })).status, 401);
  assert.equal((await request(`/api/admin/social-links/${someId}`, { method: "DELETE" })).status, 401);
  assert.equal((await request(`/api/admin/social-links/${someId}/move`, { method: "PATCH", body: json({ direction: "up" }) })).status, 401);
});

const login = await request("/api/auth/sign-in/email", { method: "POST", body: json({ email, password }) });
assert.equal(login.status, 200, "admin login failed");
const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");

await check("authenticated cross-origin social mutation is rejected", async () => {
  const response = await request("/api/admin/social-links", { method: "POST", body: json(github), headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" } }, cookie);
  assert.equal(response.status, 401);
});

await check("profile is saved for the social link FK", async () => {
  const profile = { fullName: "Phase8 Test Kişi", headline: "Phase8 başlık", shortBio: "Phase8 kısa biyografi metni.", longBio: "", location: "Gizli Phase8 Şehri", email: "hidden-phase8@example.com", isEmailVisible: false, isLocationVisible: false, availableForWork: false };
  const profileResponse = await request("/api/admin/profile", { method: "PUT", body: json(profile) }, cookie);
  assert.equal(profileResponse.status, 200);
});

await check("unsafe and invalid social URLs are rejected with 400", async () => {
  for (const url of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox(1)", "http://example.com", "not a url", "https://github.com/octocat/Hello-World"]) {
    const response = await request("/api/admin/social-links", { method: "POST", body: json({ ...github, url }) }, cookie);
    assert.equal(response.status, 400, url);
  }
  const badPlatform = await request("/api/admin/social-links", { method: "POST", body: json({ ...github, platform: "<script>" }) }, cookie);
  assert.equal(badPlatform.status, 400);
});

const ids = {};
await check("valid GitHub, website and hidden LinkedIn links are created", async () => {
  for (const [key, body] of Object.entries({
    github,
    website: { platform: "website", label: "Phase8 Web", url: "https://example.com/phase8-site", isVisible: true },
    hidden: { platform: "linkedin", label: "Phase8 Hidden LinkedIn", url: "https://www.linkedin.com/in/phase8-hidden-link", isVisible: false },
  })) {
    const response = await request("/api/admin/social-links", { method: "POST", body: json(body) }, cookie);
    assert.equal(response.status, 201, key);
    ids[key] = (await response.json()).id;
  }
});

await check("hidden link never reaches public HTML/RSC; visible links do", async () => {
  for (const path of ["/", "/cv", "/projects"]) {
    const html = await (await request(path)).text();
    assert.match(html, /example\.com\/phase8-site/, `${path} lacks visible link`);
    assert.doesNotMatch(html, /phase8-hidden-link|Phase8 Hidden LinkedIn|hidden-phase8@example\.com|Gizli Phase8 Şehri/, `${path} leaked hidden data`);
  }
});

await check("admin GitHub link drives the landing GitHub section", async () => {
  const html = await (await request("/")).text();
  assert.match(html, /id="github"/);
  assert.match(html, /href="https:\/\/github\.com\/octocat"/);
  if (networkGitHub) assert.match(html, /Spoon-Knife/, "real GitHub repositories expected");
});

await check("reorder moves a link and keeps the order in admin", async () => {
  const before = await (await request("/admin/social", {}, cookie)).text();
  assert.ok(before.indexOf("Phase8 Web") < before.indexOf("Phase8 Hidden LinkedIn"));
  assert.equal((await request(`/api/admin/social-links/${ids.hidden}/move`, { method: "PATCH", body: json({ direction: "up" }) }, cookie)).status, 200);
  const after = await (await request("/admin/social", {}, cookie)).text();
  assert.ok(after.indexOf("Phase8 Hidden LinkedIn") < after.indexOf("Phase8 Web"), "hidden link should move above website");
  assert.equal((await request(`/api/admin/social-links/${someId}/move`, { method: "PATCH", body: json({ direction: "up" }) }, cookie)).status, 404);
});

await check("visibility toggle via update publishes and unpublishes a link", async () => {
  const show = await request(`/api/admin/social-links/${ids.hidden}`, { method: "PATCH", body: json({ platform: "linkedin", label: "Phase8 Hidden LinkedIn", url: "https://www.linkedin.com/in/phase8-hidden-link", isVisible: true }) }, cookie);
  assert.equal(show.status, 200);
  assert.match(await (await request("/cv")).text(), /phase8-hidden-link/);
  const hide = await request(`/api/admin/social-links/${ids.hidden}`, { method: "PATCH", body: json({ platform: "linkedin", label: "Phase8 Hidden LinkedIn", url: "https://www.linkedin.com/in/phase8-hidden-link", isVisible: false }) }, cookie);
  assert.equal(hide.status, 200);
  assert.doesNotMatch(await (await request("/cv")).text(), /phase8-hidden-link/);
  const invalidUpdate = await request(`/api/admin/social-links/${ids.website}`, { method: "PATCH", body: json({ platform: "website", label: "x", url: "javascript:alert(1)", isVisible: true }) }, cookie);
  assert.equal(invalidUpdate.status, 400);
});

await check("delete removes links and unknown ids are 404", async () => {
  for (const id of Object.values(ids)) assert.equal((await request(`/api/admin/social-links/${id}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/api/admin/social-links/${someId}`, { method: "DELETE" }, cookie)).status, 404);
  assert.doesNotMatch(await (await request("/cv")).text(), /phase8-site/);
});

console.log(`Completed ${checks.length} Phase 8 social link HTTP checks.`);
