import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.");

const checks = [];
async function check(name, run) {
  await run(); checks.push(name); console.log(`PASS ${name}`);
}
async function request(path, options = {}, cookie = "") {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...options, headers: { Origin: baseUrl, ...(options.body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
}

const valid = {
  title: "Phase 2 Geçici Test Projesi", slug: "phase-2-gecici-test-projesi",
  shortDescription: "HTTP entegrasyon testi için geçici ve yeterince uzun açıklama.",
  detailedDescription: "Geçici vaka çalışması", problem: "Test problemi", solution: "Test çözümü", role: "Test",
  architectureDescription: "Test mimarisi", status: "completed", projectDate: "2026-09-23",
  liveUrl: "https://example.com/project", repositoryVisibility: "private",
  repositoryUrl: "https://github.com/example/phase2-private-secret", featured: true, published: false, includeInCv: false,
  skillIds: ["11111111-1111-4111-8111-111111111111"],
};

await check("unauthenticated create/update/delete/presign 401", async () => {
  for (const [path, method, body] of [
    ["/api/admin/projects", "POST", valid],
    ["/api/admin/projects/11111111-1111-4111-8111-111111111112", "PATCH", valid],
    ["/api/admin/projects/11111111-1111-4111-8111-111111111112", "DELETE", null],
    ["/api/admin/projects/11111111-1111-4111-8111-111111111112/uploads/presign", "POST", { mimeType: "image/png", size: 100 }],
  ]) assert.equal((await request(path, { method, body: body ? JSON.stringify(body) : undefined })).status, 401);
});

const login = await request("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
assert.equal(login.status, 200);
const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");

await check("invalid slug and URL 400", async () => {
  assert.equal((await request("/api/admin/projects", { method: "POST", body: JSON.stringify({ ...valid, slug: "Invalid Slug" }) }, cookie)).status, 400);
  assert.equal((await request("/api/admin/projects", { method: "POST", body: JSON.stringify({ ...valid, liveUrl: "javascript:alert(1)" }) }, cookie)).status, 400);
});

await check("nonexistent skill id 400", async () => {
  const response = await request("/api/admin/projects", { method: "POST", body: JSON.stringify({ ...valid, skillIds: ["22222222-2222-4222-8222-222222222222"] }) }, cookie);
  assert.equal(response.status, 400);
});

const createdResponse = await request("/api/admin/projects", { method: "POST", body: JSON.stringify(valid) }, cookie);
assert.equal(createdResponse.status, 201);
const { id } = await createdResponse.json();

await check("duplicate slug 400", async () => {
  assert.equal((await request("/api/admin/projects", { method: "POST", body: JSON.stringify(valid) }, cookie)).status, 400);
});

await check("unpublished project public list/detail dışında", async () => {
  assert.equal((await request(`/projects/${valid.slug}`)).status, 404);
  assert.doesNotMatch(await (await request("/projects")).text(), /Phase 2 Geçici Test Projesi/);
});

await check("authenticated update publishes project", async () => {
  assert.equal((await request(`/api/admin/projects/${id}`, { method: "PATCH", body: JSON.stringify({ ...valid, published: true }) }, cookie)).status, 200);
});

await check("private repository URL public HTML'e sızmaz", async () => {
  const detail = await request(`/projects/${valid.slug}`);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.match(html, /Özel depo/);
  assert.doesNotMatch(html, /phase2-private-secret/);
});

await check("invalid MIME, oversized and arbitrary finalize ticket rejected", async () => {
  assert.equal((await request(`/api/admin/projects/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/svg+xml", size: 100 }) }, cookie)).status, 400);
  assert.equal((await request(`/api/admin/projects/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/png", size: 5 * 1024 * 1024 + 1 }) }, cookie)).status, 400);
  assert.equal((await request(`/api/admin/projects/${id}/uploads/finalize`, { method: "POST", body: JSON.stringify({ uploadToken: "arbitrary-object-key-token-value", altText: "Test görseli", caption: "", type: "cover", width: null, height: null }) }, cookie)).status, 400);
});

if (process.env.TEST_R2_UNCONFIGURED === "1") await check("unconfigured R2 gives a clear project upload response", async () => {
  const response = await request(`/api/admin/projects/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/png", size: 100 }) }, cookie);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /R2/);
});

await check("authenticated delete and public removal", async () => {
  assert.equal((await request(`/api/admin/projects/${id}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/projects/${valid.slug}`)).status, 404);
});

console.log(`Completed ${checks.length} Phase 2 HTTP checks.`);
