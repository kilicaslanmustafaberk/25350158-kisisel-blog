import assert from "node:assert/strict";

import { extractPdfText } from "./pdf-text-extract.mjs";
import { extractUnicodePdfPages as extractPdfPages } from "./pdf-unicode-extract.mjs";

// Phase 18 certificates CMS + public/CV integration test. Run only against a disposable
// local server/database (tests/local-regression.mjs); credentials are never printed.
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error("TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.");

async function check(name, run) {
  await run();
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
const stamp = Date.now().toString(36);
const titles = {
  full: `İleri Seviye Ağ Teknolojileri ${stamp}`,
  minimal: `Yalın Sertifika ${stamp}`,
  hidden: `Gizli Sertifika ${stamp}`,
  webOnly: `Yalnız Site Sertifikası ${stamp}`,
};
const full = { title: titles.full, issuer: "BTK Akademi", instructor: "Öğrenci Ğüşiöç Eğitmen", issuedAt: "2026-03-15", expiresAt: "2028-03-15", credentialId: `BTK-${stamp}`, credentialUrl: "https://www.btkakademi.gov.tr/portal/certificate/validate", description: "Şebeke, yönlendirme ve güvenlik üzerine çalışma.", isVisible: true, showInCv: true };

await check("unauthenticated certificate create/update/delete/move are 401", async () => {
  assert.equal((await request("/api/admin/certificates", { method: "POST", body: json(full) })).status, 401);
  assert.equal((await request(`/api/admin/certificates/${someId}`, { method: "PATCH", body: json(full) })).status, 401);
  assert.equal((await request(`/api/admin/certificates/${someId}`, { method: "DELETE" })).status, 401);
  assert.equal((await request(`/api/admin/certificates/${someId}/move`, { method: "PATCH", body: json({ direction: "up" }) })).status, 401);
  const page = await request("/admin/certificates");
  assert.ok([302, 303, 307, 308].includes(page.status), `admin page must redirect anonymous users (got ${page.status})`);
});

const login = await request("/api/auth/sign-in/email", { method: "POST", body: json({ email, password }) });
assert.equal(login.status, 200, "admin login failed");
const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");

await check("authenticated cross-origin certificate mutation is rejected", async () => {
  const response = await request("/api/admin/certificates", { method: "POST", body: json(full), headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" } }, cookie);
  assert.equal(response.status, 401);
});

await check("profile exists for CV rendering", async () => {
  const profile = { fullName: "Phase18 Test Kişi", headline: "Phase18 başlık", shortBio: "Phase18 kısa biyografi metni.", longBio: "", location: "", email: "", isEmailVisible: false, isLocationVisible: false, availableForWork: false };
  assert.equal((await request("/api/admin/profile", { method: "PUT", body: json(profile) }, cookie)).status, 200);
});

await check("invalid input is rejected: missing title, unsafe credential URLs, reversed dates", async () => {
  assert.equal((await request("/api/admin/certificates", { method: "POST", body: json({ ...full, title: "" }) }, cookie)).status, 400);
  for (const credentialUrl of ["javascript:alert(1)", "data:text/html,x", "vbscript:msgbox(1)", "http://example.com/c", "custom-app://open", "https://u:p@example.com/c"]) {
    const response = await request("/api/admin/certificates", { method: "POST", body: json({ ...full, credentialUrl }) }, cookie);
    assert.equal(response.status, 400, credentialUrl);
    assert.ok((await response.json()).details?.credentialUrl, credentialUrl);
  }
  assert.equal((await request("/api/admin/certificates", { method: "POST", body: json({ ...full, issuedAt: "2026-05-01", expiresAt: "2026-01-01" }) }, cookie)).status, 400);
  assert.equal((await request("/api/admin/certificates", { method: "POST", body: "{bad" }, cookie)).status, 400);
});

const ids = {};
await check("certificates are created (full, title-only, hidden, site-only)", async () => {
  const create = async (body) => {
    const response = await request("/api/admin/certificates", { method: "POST", body: json(body) }, cookie);
    assert.equal(response.status, 201);
    return (await response.json()).id;
  };
  ids.full = await create(full);
  ids.minimal = await create({ title: titles.minimal, issuer: "", instructor: "", issuedAt: "", expiresAt: "", credentialId: "", credentialUrl: "", description: "", isVisible: true, showInCv: true });
  ids.hidden = await create({ ...full, title: titles.hidden, credentialId: `HIDDEN-${stamp}`, isVisible: false, showInCv: true });
  ids.webOnly = await create({ title: titles.webOnly, isVisible: true, showInCv: false, id: someId, displayOrder: -5 });
  assert.notEqual(ids.webOnly, someId, "client-supplied id must be ignored");
});

const landing = async () => (await request("/")).text();
const webCv = async () => (await request("/cv")).text();
const certificatesSection = (html) => /<section[^>]*id="certificates"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";

await check("landing shows visible certificates in a spine sequence; hidden rows never reach HTML/RSC", async () => {
  const html = await landing();
  const section = certificatesSection(html);
  assert.ok(section, "certificates section renders");
  assert.match(section, /data-spine-sequence/);
  assert.match(section, /data-spine-lane="certificates"/);
  assert.match(section, /SERTİFİKALAR/);
  for (const title of [titles.full, titles.minimal, titles.webOnly]) assert.ok(section.includes(title), title);
  assert.ok(!html.includes(titles.hidden) && !html.includes(`HIDDEN-${stamp}`), "hidden certificate leaked into landing HTML/RSC payload");
  assert.match(section, /BTK Akademi · 03\/2026/);
  assert.match(section, /href="https:\/\/www\.btkakademi\.gov\.tr\/portal\/certificate\/validate"[^>]*rel="noopener noreferrer"/);
  assert.match(section, /Doğrula/);
  const items = section.match(/<li[^>]*data-spine-item[\s\S]*?<\/li>/g) ?? [];
  const minimalItem = items.find((item) => item.includes(titles.minimal)) ?? "";
  assert.ok(minimalItem, "title-only certificate item");
  assert.doesNotMatch(minimalItem, /certificate-meta|certificate-detail|certificate-verify|Doğrula/, "title-only certificate must not render empty rows or actions");
  assert.doesNotMatch(section, />\s*[-–—]\s*</, "no placeholder dash cells");
  assert.match(html, /href="#certificates"/, "right indicator lists the section");
});

await check("web CV lists only visible + showInCv certificates, with Turkish text intact", async () => {
  const html = await webCv();
  assert.match(html, /id="cv-certificates"[^>]*>Sertifikalar</);
  assert.ok(html.includes(titles.full) && html.includes(titles.minimal));
  assert.ok(!html.includes(titles.webOnly), "showInCv=false leaked into web CV");
  assert.ok(!html.includes(titles.hidden), "hidden certificate leaked into web CV");
  assert.ok(html.includes("Eğitmen: Öğrenci Ğüşiöç Eğitmen") && html.includes("Geçerlilik: 03/2028") && html.includes(`Sertifika No: BTK-${stamp}`));
  assert.match(html, /Doğrulama bağlantısı/);
});

await check("PDF CV is valid and contains CV certificates only", async () => {
  const response = await request("/api/cv/pdf");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/pdf/);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (process.env.TEST_PDF_OUTPUT) { const { writeFile } = await import("node:fs/promises"); await writeFile(process.env.TEST_PDF_OUTPUT.replace(/\.pdf$/, "-phase18.pdf"), buffer); }
  assert.equal(buffer.subarray(0, 4).toString("latin1"), "%PDF");
  const text = extractPdfText(buffer);
  for (const expected of ["Sertifikalar", titles.full, "BTK Akademi", "Öğrenci Ğüşiöç Eğitmen", titles.minimal, "Doğrulama bağlantısı"]) assert.ok(text.includes(expected), `PDF missing: ${expected}`);
  assert.ok(!text.includes(titles.webOnly) && !text.includes(titles.hidden), "filtered certificate leaked into PDF");
  assert.ok(!text.includes("btkakademi.gov.tr/portal"), "raw long verification URL must not be printed");
});

await check("update toggles CV visibility and metadata blanks disappear", async () => {
  const response = await request(`/api/admin/certificates/${ids.full}`, { method: "PATCH", body: json({ ...full, issuer: "", credentialUrl: "", showInCv: false }) }, cookie);
  assert.equal(response.status, 200);
  const cvHtml = await webCv();
  assert.ok(!cvHtml.includes(titles.full), "showInCv=false must remove it from CV");
  const section = certificatesSection(await landing());
  const item = (section.match(/<li[^>]*data-spine-item[\s\S]*?<\/li>/g) ?? []).find((value) => value.includes(titles.full)) ?? "";
  assert.ok(item && !item.includes("BTK Akademi") && !item.includes("Doğrula"), "cleared issuer/link must not render");
  assert.match(item, /03\/2026/, "date alone still renders without a separator");
  assert.doesNotMatch(item, /·\s*</);
  assert.equal((await request(`/api/admin/certificates/${someId}`, { method: "PATCH", body: json(full) }, cookie)).status, 404);
  assert.equal((await request(`/api/admin/certificates/${ids.full}`, { method: "PATCH", body: json({ ...full, credentialUrl: "javascript:alert(1)" }) }, cookie)).status, 400);
});

await check("ordering moves are persisted and reflected on the landing", async () => {
  // Order is full, minimal, hidden, webOnly: two moves up put webOnly above minimal.
  for (let i = 0; i < 2; i++) assert.equal((await request(`/api/admin/certificates/${ids.webOnly}/move`, { method: "PATCH", body: json({ direction: "up" }) }, cookie)).status, 200);
  assert.equal((await request(`/api/admin/certificates/${ids.webOnly}/move`, { method: "PATCH", body: json({ direction: "sideways" }) }, cookie)).status, 400);
  assert.equal((await request(`/api/admin/certificates/${someId}/move`, { method: "PATCH", body: json({ direction: "up" }) }, cookie)).status, 404);
  const section = certificatesSection(await landing());
  assert.ok(section.indexOf(titles.webOnly) < section.indexOf(titles.minimal), "moved certificate precedes the one above it");
  const admin = await (await request("/admin/certificates", {}, cookie)).text();
  assert.ok(admin.includes(titles.hidden), "admin list includes hidden rows");
});

await check("contact regression: rows keep safe links and one spine anchor each", async () => {
  const html = await landing();
  const contact = /<section[^>]*id="contact"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  const rows = contact.match(/<li[^>]*data-spine-item[\s\S]*?<\/li>/g) ?? [];
  assert.ok(rows.length > 0);
  for (const row of rows) {
    assert.equal((row.match(/data-spine-anchor=/g) ?? []).length, 1);
    // 1.9.0: the Contact CV row links to the primary CV PDF (same-origin /api/cv/pdf).
    assert.match(row, /href="(mailto:|tel:\+?\d|https:\/\/|\/cv|\/api\/cv\/pdf")/);
    assert.doesNotMatch(row, /href="(javascript|data):/i);
  }
});

await check("PDF pagination: no orphan headings, entries stay whole, no near-empty pages", async () => {
  // Regression for the 1.8.3 three-page CV: a fitting section was pushed to page 2 by its
  // trailing margin, and an experience description split off alone onto page 3. The fixture is
  // long enough to cross several page boundaries so entry integrity is actually exercised.
  const created = { certificates: [], experiences: [] };
  const experienceCount = 10;
  try {
    for (let i = 0; i < 12; i++) {
      const response = await request("/api/admin/certificates", { method: "POST", body: json({ ...full, title: `Sayfalama Sertifikası ${i} ${stamp}`, credentialId: `PG-${i}-${stamp}`, description: "", isVisible: true, showInCv: true }) }, cookie);
      assert.equal(response.status, 201);
      created.certificates.push((await response.json()).id);
    }
    for (let i = 0; i < experienceCount; i++) {
      const filler = " Bölümümde üç dönem okul ve bir dönem zorunlu staj süreci bulunuyor; staj yetmiş üç iş günü sürecek.".repeat(1 + (i % 3));
      const description = `Deneyim ${i} açıklaması ${stamp}.${filler} Son cümle ${i} ${stamp}.`;
      const response = await request("/api/admin/experience", { method: "POST", body: json({ organization: `Sayfalama Kurumu ${i} ${stamp}`, position: `Sayfalama Stajyeri ${i} ${stamp}`, startDate: "2027-02-15", endDate: "2027-06-04", isCurrent: false, description, isVisible: true }) }, cookie);
      assert.equal(response.status, 201);
      created.experiences.push((await response.json()).id);
    }

    const response = await request("/api/cv/pdf");
    assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (process.env.TEST_PDF_OUTPUT) { const { writeFile } = await import("node:fs/promises"); await writeFile(process.env.TEST_PDF_OUTPUT.replace(/\.pdf$/, "-phase18-pagination.pdf"), buffer); }
    const pages = extractPdfPages(buffer).map((page) => page.split("\n").map((line) => line.trim()).filter(Boolean));
    assert.ok(pages.length >= 2, `fixture must span several pages (got ${pages.length})`);
    assert.equal(pages.flat().join("").replace(/\s+/g, "").length, extractPdfText(buffer).replace(/\s+/g, "").length, "per-page extraction covers the whole document");

    const pageOf = (needle) => pages.findIndex((lines) => lines.join(" ").includes(needle));
    for (let i = 0; i < experienceCount; i++) {
      const entryPage = pageOf(`Sayfalama Stajyeri ${i} ${stamp}`);
      assert.ok(entryPage >= 0, `experience ${i} is in the PDF`);
      for (const part of [`Sayfalama Kurumu ${i} ${stamp}`, `Deneyim ${i} açıklaması ${stamp}`, `Son cümle ${i} ${stamp}.`]) {
        assert.equal(pageOf(part), entryPage, `experience ${i} split across pages at "${part}"`);
      }
    }
    for (let i = 0; i < 12; i++) assert.equal(pageOf(`Sayfalama Sertifikası ${i} ${stamp}`), pageOf(`PG-${i}-${stamp}`), `certificate ${i} split across pages`);

    for (const heading of ["Profesyonel Özet", "Yetenekler", "Projeler", "Deneyim", "Eğitim", "Sertifikalar"]) {
      pages.forEach((lines, index) => {
        const at = lines.indexOf(heading);
        if (at >= 0) assert.ok(at < lines.length - 1, `section heading "${heading}" is orphaned at the bottom of page ${index + 1}`);
      });
    }
    const sizes = pages.map((lines) => lines.join("").length);
    const largest = Math.max(...sizes);
    sizes.slice(0, -1).forEach((size, index) => assert.ok(size >= largest * 0.5, `page ${index + 1} is mostly empty (${size} vs ${largest} chars) although more pages follow`));
  } finally {
    for (const id of created.certificates) await request(`/api/admin/certificates/${id}`, { method: "DELETE" }, cookie);
    for (const id of created.experiences) await request(`/api/admin/experience/${id}`, { method: "DELETE" }, cookie);
  }
});

await check("delete removes certificates everywhere; empty state omits the section", async () => {
  for (const id of Object.values(ids)) assert.equal((await request(`/api/admin/certificates/${id}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/api/admin/certificates/${ids.full}`, { method: "DELETE" }, cookie)).status, 404);
  assert.equal((await request("/api/admin/certificates/not-a-uuid", { method: "DELETE" }, cookie)).status, 400);
  const html = await landing();
  assert.equal(certificatesSection(html), "", "no visible certificates → no landing section");
  assert.doesNotMatch(html, /href="#certificates"/);
  assert.doesNotMatch(await webCv(), /id="cv-certificates"/);
  const pdf = await request("/api/cv/pdf");
  assert.equal(pdf.status, 200);
  assert.ok(!extractPdfText(Buffer.from(await pdf.arrayBuffer())).includes("Sertifikalar"));
});

console.log("Phase 18 certificates HTTP checks passed.");
