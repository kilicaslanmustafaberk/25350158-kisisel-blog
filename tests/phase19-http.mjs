import assert from "node:assert/strict";

// 1.9.0 uploaded professional CV. Two modes, both against disposable servers/databases only:
//  - default (tests/local-regression.mjs, R2 unconfigured): auth, validation, generated fallback,
//    inline/attachment delivery, public entry points, secret leakage.
//  - TEST_R2_MOCK_URL set (tests/cv-upload-regression.mjs): full presign → PUT → finalize flow
//    against a local S3 mock, fake-PDF rejection, replacement, removal and storage-outage fallback.
// Credentials are never printed.
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
const mockUrl = process.env.TEST_R2_MOCK_URL;
if (!email || !password) throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.");

let passed = 0;
async function check(name, run) {
  await run();
  passed += 1;
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
const pdfBytes = (label) => Buffer.from(`%PDF-1.4\n% ${label}\n1 0 obj <<>> endobj\ntrailer <<>>\n%%EOF\n`);
const secrets = [process.env.BETTER_AUTH_SECRET, password, process.env.R2_SECRET_ACCESS_KEY, process.env.R2_ACCESS_KEY_ID].filter((value) => value && value.length >= 8);
const assertNoSecrets = (text, where) => { for (const secret of secrets) assert.ok(!text.includes(secret), `secret leaked in ${where}`); };

const login = await request("/api/auth/sign-in/email", { method: "POST", body: json({ email, password }) });
assert.equal(login.status, 200, "admin sign-in failed");
const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
const valid = { fileName: "Profesyonel CV.pdf", mimeType: "application/pdf", size: 1000 };

await check("anonymous CV presign, finalize and removal are rejected (401)", async () => {
  assert.equal((await request("/api/admin/cv/pdf/presign", { method: "POST", body: json(valid) })).status, 401);
  assert.equal((await request("/api/admin/cv/pdf/finalize", { method: "POST", body: json({ uploadToken: "x".repeat(40) }) })).status, 401);
  assert.equal((await request("/api/admin/cv/pdf", { method: "DELETE" })).status, 401);
});

await check("cross-origin admin CV mutations are rejected even with a session", async () => {
  const evil = { Origin: "https://evil.example" };
  assert.equal((await request("/api/admin/cv/pdf/presign", { method: "POST", body: json(valid), headers: evil }, cookie)).status, 401);
  assert.equal((await request("/api/admin/cv/pdf", { method: "DELETE", headers: evil }, cookie)).status, 401);
});

await check("presign rejects wrong MIME, >5 MB, empty files and non-.pdf names (400)", async () => {
  for (const body of [
    { ...valid, mimeType: "text/html" },
    { ...valid, mimeType: "image/svg+xml" },
    { ...valid, mimeType: "image/png" },
    { ...valid, size: 5 * 1024 * 1024 + 1 },
    { ...valid, size: 0 },
    { ...valid, fileName: "cv.html" },
  ]) {
    assert.equal((await request("/api/admin/cv/pdf/presign", { method: "POST", body: json(body) }, cookie)).status, 400, JSON.stringify(body));
  }
});

await check("finalize rejects forged, malformed and image-scoped tickets (400)", async () => {
  for (const uploadToken of ["arbitrary-object-key-token-value", `${Buffer.from(json({ scope: "cv", key: "projects/x.png" })).toString("base64url")}.forged-signature-value`]) {
    assert.equal((await request("/api/admin/cv/pdf/finalize", { method: "POST", body: json({ uploadToken }) }, cookie)).status, 400);
  }
});

async function fetchCv(query = "") {
  const response = await request(`/api/cv/pdf${query}`);
  return { response, bytes: Buffer.from(await response.arrayBuffer()) };
}

function assertPdfHeaders(response, disposition) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-disposition") ?? "", new RegExp(`^${disposition}; filename="[a-z0-9-]+-cv\\.pdf"$`));
  assert.doesNotMatch(response.headers.get("content-disposition") ?? "", /[0-9a-f]{8}-[0-9a-f]{4}/, "storage UUID leaked into filename");
}

if (!mockUrl) {
  await check("R2 unconfigured: valid admin presign returns a clear 503", async () => {
    const response = await request("/api/admin/cv/pdf/presign", { method: "POST", body: json(valid) }, cookie);
    assert.equal(response.status, 503);
  });

  await check("no uploaded CV: /api/cv/pdf serves the generated PDF inline", async () => {
    const { response, bytes } = await fetchCv();
    assertPdfHeaders(response, "inline");
    assert.equal(response.headers.get("x-cv-source"), "generated");
    assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  });

  await check("download=1 uses attachment; arbitrary key/url query parameters are ignored", async () => {
    const { response } = await fetchCv("?download=1");
    assertPdfHeaders(response, "attachment");
    for (const query of ["?key=projects/11111111-1111-4111-8111-111111111111/11111111-1111-4111-8111-111111111111.png", "?url=https://evil.example/cv.pdf", "?key=../../local.db"]) {
      const result = await fetchCv(query);
      assertPdfHeaders(result.response, "inline");
      assert.equal(result.response.headers.get("x-cv-source"), "generated");
    }
  });

  await check("admin CV page shows the Profesyonel CV PDF section (Yüklenmedi) without secrets", async () => {
    const html = await (await request("/admin/cv", {}, cookie)).text();
    assert.match(html, /Profesyonel CV PDF/);
    assert.match(html, /Yüklenmedi/);
    assert.match(html, /Otomatik oluşturulan PDF \(yedek\)/);
    assertNoSecrets(html, "admin CV HTML");
    const rsc = await (await request("/admin/cv", { headers: { RSC: "1" } }, cookie)).text();
    assertNoSecrets(rsc, "admin CV RSC");
    assert.equal((await request("/admin/cv")).status, 307, "anonymous admin CV page must redirect");
  });

  await check("removal without an upload is a safe no-op", async () => {
    const response = await request("/api/admin/cv/pdf", { method: "DELETE" }, cookie);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, removed: false });
  });

  await check("public entry points: navbar/hero/contact open the PDF in a new tab, Web CV stays at /cv", async () => {
    const home = await (await request("/")).text();
    assert.match(home, /<a href="\/api\/cv\/pdf" target="_blank" rel="noopener">CV<span class="sr-only">/);
    assert.ok((home.match(/href="\/api\/cv\/pdf" target="_blank"/g) ?? []).length >= 3, "hero/CV panel/contact links");
    assert.match(home, /href="\/cv">Web CV</);
    const webCv = await request("/cv");
    assert.equal(webCv.status, 200);
    assert.match(await webCv.text(), /href="\/api\/cv\/pdf\?download=1"/);
    assertNoSecrets(home, "home HTML");
  });
} else {
  const storedKeys = async () => (await fetch(`${mockUrl}/__objects`)).json();

  async function upload(bytes, { declaredSize = bytes.length, putType = "application/pdf", fileName = "Profesyonel CV.pdf" } = {}) {
    const presign = await request("/api/admin/cv/pdf/presign", { method: "POST", body: json({ fileName, mimeType: "application/pdf", size: declaredSize }) }, cookie);
    assert.equal(presign.status, 200);
    const ticket = await presign.json();
    const target = new URL(ticket.uploadUrl);
    assert.equal(target.origin, mockUrl, "presigned PUT must target the storage endpoint");
    assert.match(target.pathname, /^\/test-bucket\/cv\/[0-9a-f-]{36}\.pdf$/);
    assert.equal((await fetch(ticket.uploadUrl, { method: "PUT", headers: { "Content-Type": putType }, body: bytes })).status, 200);
    const finalize = await request("/api/admin/cv/pdf/finalize", { method: "POST", body: json({ uploadToken: ticket.uploadToken }) }, cookie);
    return { finalize, key: target.pathname.replace("/test-bucket/", ""), ticket };
  }

  const first = pdfBytes("first professional cv");
  let firstKey;

  await check("seed profile so the generated fallback is available", async () => {
    const response = await request("/api/admin/profile", { method: "PUT", body: json({ fullName: "Phase19 Test Kisisi", headline: "Bilgisayar Programcılığı", shortBio: "Phase 19 yüklenen CV regresyon testi için geçici biyografi metni.", longBio: "", location: "", email: "", isEmailVisible: false, isLocationVisible: false, availableForWork: false }) }, cookie);
    assert.equal(response.status, 200);
    assert.equal((await fetchCv()).response.headers.get("x-cv-source"), "generated");
  });

  await check("valid admin PDF upload (presign → PUT → finalize) is accepted and becomes active", async () => {
    const { finalize, key } = await upload(first);
    assert.equal(finalize.status, 201);
    firstKey = key;
    assert.deepEqual(await storedKeys(), [key]);
    const { response, bytes } = await fetchCv();
    assertPdfHeaders(response, "inline");
    assert.equal(response.headers.get("x-cv-source"), "uploaded");
    assert.ok(bytes.equals(first), "public endpoint must serve the uploaded bytes");
    assert.equal(response.headers.get("content-disposition"), 'inline; filename="phase19-test-kisisi-cv.pdf"');
  });

  await check("download=1 serves the uploaded CV as an attachment", async () => {
    const { response, bytes } = await fetchCv("?download=1");
    assertPdfHeaders(response, "attachment");
    assert.ok(bytes.equals(first));
  });

  await check("fake PDF (HTML renamed .pdf, declared application/pdf) is rejected, discarded, active CV kept", async () => {
    const { finalize, key } = await upload(Buffer.from("<!doctype html><script>alert(1)</script>"));
    assert.equal(finalize.status, 400);
    assert.ok(!(await storedKeys()).includes(key), "rejected object must be deleted");
    assert.ok((await fetchCv()).bytes.equals(first));
  });

  await check("SVG and image bytes renamed .pdf are rejected", async () => {
    for (const bytes of [Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])]) {
      assert.equal((await upload(bytes)).finalize.status, 400);
    }
  });

  await check("wrong stored MIME and size mismatch are rejected; active CV unaffected", async () => {
    assert.equal((await upload(pdfBytes("wrong type"), { putType: "text/html" })).finalize.status, 400);
    assert.equal((await upload(pdfBytes("size mismatch"), { declaredSize: 10 })).finalize.status, 400);
    assert.deepEqual(await storedKeys(), [firstKey]);
    assert.equal((await fetchCv()).response.headers.get("x-cv-source"), "uploaded");
  });

  await check("finalize ticket cannot be replayed as a project image ticket", async () => {
    const presign = await (await request("/api/admin/cv/pdf/presign", { method: "POST", body: json(valid) }, cookie)).json();
    const response = await request("/api/admin/projects/11111111-1111-4111-8111-111111111111/uploads/finalize", { method: "POST", body: json({ uploadToken: presign.uploadToken, altText: "Test görseli", caption: "", type: "cover", width: null, height: null }) }, cookie);
    assert.equal(response.status, 400);
  });

  await check("replacement activates the new PDF and deletes the previous object", async () => {
    const second = pdfBytes("second professional cv");
    const { finalize, key } = await upload(second, { fileName: "Yeni CV.pdf" });
    assert.equal(finalize.status, 201);
    assert.deepEqual(await storedKeys(), [key], "previous object must be cleaned up after the switch");
    assert.ok((await fetchCv()).bytes.equals(second));
    const html = await (await request("/admin/cv", {}, cookie)).text();
    assert.match(html, /Yüklendi/);
    assert.match(html, /Yeni CV\.pdf/);
    assert.ok(!html.includes(key), "storage key must not be shown in the admin UI");
  });

  await check("arbitrary R2 objects cannot be requested through public endpoints", async () => {
    const [activeKey] = await storedKeys();
    for (const query of [`?key=${activeKey}`, "?key=projects/x.png", `?url=${encodeURIComponent(`${mockUrl}/test-bucket/${activeKey}`)}`]) {
      const { response } = await fetchCv(query);
      assert.equal(response.headers.get("x-cv-source"), "uploaded");
    }
    const proxied = await request(`/api/media/r2?url=${encodeURIComponent(`https://media.test.invalid/${activeKey}`)}`);
    assert.notEqual(proxied.status, 200, "image proxy must not serve CV objects");
  });

  await check("storage outage degrades to the generated PDF instead of breaking the CV link", async () => {
    await fetch(`${mockUrl}/__fail?on=1`);
    try {
      const { response, bytes } = await fetchCv();
      assertPdfHeaders(response, "inline");
      assert.equal(response.headers.get("x-cv-source"), "generated");
      assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
    } finally {
      await fetch(`${mockUrl}/__fail?on=0`);
    }
  });

  await check("secrets never appear in admin HTML/RSC, presign/finalize JSON or public responses", async () => {
    const html = await (await request("/admin/cv", {}, cookie)).text();
    const rsc = await (await request("/admin/cv", { headers: { RSC: "1" } }, cookie)).text();
    const presign = await (await request("/api/admin/cv/pdf/presign", { method: "POST", body: json(valid) }, cookie)).text();
    const home = await (await request("/")).text();
    for (const [where, text] of [["admin HTML", html], ["admin RSC", rsc], ["home", home]]) assertNoSecrets(text, where);
    // An S3 presigned URL carries the access key *ID* in X-Amz-Credential by design (admin-only,
    // not a secret, same as image uploads); the secret key, auth secret and password must not appear.
    for (const secret of [process.env.R2_SECRET_ACCESS_KEY, process.env.BETTER_AUTH_SECRET, password]) assert.ok(!presign.includes(secret), "secret leaked in presign JSON");
    assert.doesNotMatch(home, /cv\/[0-9a-f-]{36}\.pdf/, "public HTML must not expose storage keys");
  });

  await check("removal clears the active CV, deletes the object and falls back to the generated PDF", async () => {
    const response = await request("/api/admin/cv/pdf", { method: "DELETE" }, cookie);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, removed: true });
    assert.deepEqual(await storedKeys(), []);
    const { response: pdf } = await fetchCv();
    assertPdfHeaders(pdf, "inline");
    assert.equal(pdf.headers.get("x-cv-source"), "generated");
  });
}

console.log(`Phase 19 ${mockUrl ? "upload" : "fallback"} checks passed: ${passed}`);
