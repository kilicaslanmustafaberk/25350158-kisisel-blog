import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.");

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

const categoryId = "33333333-3333-4333-8333-333333333333";
const tagId = "44444444-4444-4444-8444-444444444444";

const validDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Merhaba dünya" }] }] };
const valid = {
  title: "Phase 3 Geçici Test Yazısı",
  slug: "phase-3-gecici-test-yazisi",
  excerpt: "HTTP entegrasyon testi için yeterince uzun bir özet metni.",
  content: validDoc,
  categoryId,
  tagIds: [tagId],
  newTagNames: [],
  status: "draft",
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
};

await check("unauthenticated create/update/delete/presign 401", async () => {
  for (const [path, method, body] of [
    ["/api/admin/posts", "POST", valid],
    ["/api/admin/posts/11111111-1111-4111-8111-111111111112", "PATCH", valid],
    ["/api/admin/posts/11111111-1111-4111-8111-111111111112", "DELETE", null],
    ["/api/admin/posts/11111111-1111-4111-8111-111111111112/uploads/presign", "POST", { mimeType: "image/png", size: 100 }],
  ]) {
    assert.equal((await request(path, { method, body: body ? JSON.stringify(body) : undefined })).status, 401);
  }
});

const login = await request("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
assert.equal(login.status, 200);
const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");

await check("geçersiz slug ve çok kısa özet 400", async () => {
  assert.equal((await request("/api/admin/posts", { method: "POST", body: JSON.stringify({ ...valid, slug: "Invalid Slug" }) }, cookie)).status, 400);
  assert.equal((await request("/api/admin/posts", { method: "POST", body: JSON.stringify({ ...valid, excerpt: "kısa" }) }, cookie)).status, 400);
});

await check("geçersiz kategori/etiket ID 400", async () => {
  const badCategory = await request("/api/admin/posts", { method: "POST", body: JSON.stringify({ ...valid, categoryId: "22222222-2222-4222-8222-222222222299" }) }, cookie);
  assert.equal(badCategory.status, 400);
  const badTag = await request("/api/admin/posts", { method: "POST", body: JSON.stringify({ ...valid, tagIds: ["22222222-2222-4222-8222-222222222299"] }) }, cookie);
  assert.equal(badTag.status, 400);
});

await check("malformed Tiptap JSON ve desteklenmeyen düğüm 400", async () => {
  const malformed = await request("/api/admin/posts", { method: "POST", body: JSON.stringify({ ...valid, content: { type: "not-a-doc" } }) }, cookie);
  assert.equal(malformed.status, 400);
  const unsupported = await request(
    "/api/admin/posts",
    { method: "POST", body: JSON.stringify({ ...valid, content: { type: "doc", content: [{ type: "image", attrs: { src: "https://example.com/x.png" } }] } }) },
    cookie,
  );
  assert.equal(unsupported.status, 400);
});

await check("javascript: link ve <script> payload reddedilir", async () => {
  const scriptText = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] };
  const response = await request("/api/admin/posts", { method: "POST", body: JSON.stringify({ ...valid, content: scriptText }) }, cookie);
  assert.equal(response.status, 400);
});

const createdResponse = await request("/api/admin/posts", { method: "POST", body: JSON.stringify(valid) }, cookie);
assert.equal(createdResponse.status, 201);
const { id } = await createdResponse.json();

await check("duplicate slug 400", async () => {
  assert.equal((await request("/api/admin/posts", { method: "POST", body: JSON.stringify(valid) }, cookie)).status, 400);
});

await check("draft yazı public listede yok, detay 404", async () => {
  assert.equal((await request(`/blog/${valid.slug}`)).status, 404);
  assert.doesNotMatch(await (await request("/blog")).text(), /Phase 3 Geçici Test Yazısı/);
});

await check("unauthorized cover presign reddedilir", async () => {
  assert.equal((await request(`/api/admin/posts/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/png", size: 100 }) })).status, 401);
});

await check("yayınla → publishedAt otomatik atanır ve published post görünür", async () => {
  const publish = await request(`/api/admin/posts/${id}/state`, { method: "PATCH", body: JSON.stringify({ status: "published" }) }, cookie);
  assert.equal(publish.status, 200);
  const detail = await request(`/blog/${valid.slug}`);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.match(html, /Phase 3 Geçici Test Yazısı/);
  assert.match(html, /Merhaba dünya/);
});

await check("script payload public HTML'de çalıştırılabilir olarak yer almaz", async () => {
  const html = await (await request(`/blog/${valid.slug}`)).text();
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

await check("geçersiz MIME ve oversized cover upload reddedilir", async () => {
  assert.equal((await request(`/api/admin/posts/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/svg+xml", size: 100 }) }, cookie)).status, 400);
  assert.equal((await request(`/api/admin/posts/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/png", size: 5 * 1024 * 1024 + 1 }) }, cookie)).status, 400);
  assert.equal(
    (await request(`/api/admin/posts/${id}/uploads/finalize`, { method: "POST", body: JSON.stringify({ uploadToken: "arbitrary-token-value", altText: "Test görseli", width: null, height: null }) }, cookie)).status,
    400,
  );
});

if (process.env.TEST_R2_UNCONFIGURED === "1") await check("unconfigured R2 gives a clear blog upload response", async () => {
  const response = await request(`/api/admin/posts/${id}/uploads/presign`, { method: "POST", body: JSON.stringify({ mimeType: "image/png", size: 100 }) }, cookie);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /R2/);
});

await check("authenticated delete ve public kaldırma", async () => {
  assert.equal((await request(`/api/admin/posts/${id}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/blog/${valid.slug}`)).status, 404);
});

console.log(`Completed ${checks.length} Phase 3 HTTP checks.`);
