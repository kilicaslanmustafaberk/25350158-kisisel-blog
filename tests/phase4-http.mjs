import assert from "node:assert/strict";

import { extractPdfText } from "./pdf-text-extract.mjs";

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

const HIDDEN_LOCATION = "GizliKonumTest";
const HIDDEN_SKILL = "GizliYetenekTest";
const VISIBLE_SKILL = "GorunurYetenekTest";
const UNPUBLISHED_PROJECT_TITLE = "Phase4 Yayinlanmamis Proje";
const CV_PROJECT_TITLE = "Phase4 CV Projesi";

await check("unauthenticated profile/education/experience/skill/cv-settings mutation 401", async () => {
  for (const [path, method, body] of [
    ["/api/admin/profile", "PUT", { fullName: "x", headline: "x", shortBio: "yeterince uzun bir biyografi metni buraya", longBio: "", location: "", email: "", isEmailVisible: false, isLocationVisible: false, availableForWork: false }],
    ["/api/admin/education", "POST", { institution: "x", program: "x", startDate: "2020-01-01", endDate: "", isCurrent: false, description: "", isVisible: true }],
    ["/api/admin/experience", "POST", { organization: "x", position: "x", startDate: "2020-01-01", endDate: "", isCurrent: false, description: "", isVisible: true }],
    ["/api/admin/skills", "POST", { name: "x", slug: "x", category: "x", description: "", isVisible: true }],
    ["/api/admin/cv/settings", "PUT", { title: "x", summaryOverride: "", language: "tr", sectionVisibility: {}, sectionOrder: [], maxProjects: 6 }],
  ]) {
    assert.equal((await request(path, { method, body: JSON.stringify(body) })).status, 401);
  }
});

const login = await request("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify({ email, password }) });
assert.equal(login.status, 200);
const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");

await check("profil: geçersiz email reddedilir", async () => {
  const response = await request(
    "/api/admin/profile",
    { method: "PUT", body: JSON.stringify({ fullName: "Test Kullanici", headline: "Rol", shortBio: "yeterince uzun bir biyografi metni buraya yazildi", longBio: "", location: "", email: "not-an-email", isEmailVisible: false, isLocationVisible: false, availableForWork: false }) },
    cookie,
  );
  assert.equal(response.status, 400);
});

await check("eğitim: bitiş başlangıçtan önce ve current+endDate reddedilir", async () => {
  const base = { institution: "Test Uni", program: "Test Bolum", isVisible: true, description: "" };
  const badOrder = await request("/api/admin/education", { method: "POST", body: JSON.stringify({ ...base, startDate: "2024-09-01", endDate: "2020-06-30", isCurrent: false }) }, cookie);
  assert.equal(badOrder.status, 400);
  const badCurrent = await request("/api/admin/education", { method: "POST", body: JSON.stringify({ ...base, startDate: "2020-09-01", endDate: "2024-06-30", isCurrent: true }) }, cookie);
  assert.equal(badCurrent.status, 400);
});

await check("skill: geçersiz slug reddedilir", async () => {
  const response = await request("/api/admin/skills", { method: "POST", body: JSON.stringify({ name: "Bad Slug Skill", slug: "Bad Slug", category: "Test", description: "", isVisible: true }) }, cookie);
  assert.equal(response.status, 400);
});

await check("cv settings: geçersiz section order reddedilir", async () => {
  const response = await request("/api/admin/cv/settings", { method: "PUT", body: JSON.stringify({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionVisibility: {}, sectionOrder: ["not-a-real-section"], maxProjects: 6 }) }, cookie);
  assert.equal(response.status, 400);
});

await check("olmayan eğitim/deneyim/yetenek kaydı 404", async () => {
  const fakeId = "11111111-1111-4111-8111-111111111199";
  assert.equal((await request(`/api/admin/education/${fakeId}`, { method: "DELETE" }, cookie)).status, 404);
  assert.equal((await request(`/api/admin/experience/${fakeId}`, { method: "DELETE" }, cookie)).status, 404);
  assert.equal((await request(`/api/admin/skills/${fakeId}`, { method: "DELETE" }, cookie)).status, 404);
  assert.equal((await request(`/api/admin/projects/${fakeId}/state`, { method: "PATCH", body: JSON.stringify({ field: "includeInCv", value: true }) }, cookie)).status, 404);
});

// ---- build a real CV fixture ----

const profileBody = {
  fullName: "Phase4 Test Kisisi",
  headline: "Phase4 HTTP Test Headline",
  shortBio: "Bu profil Phase 4 HTTP entegrasyon testleri için oluşturulmuş geçici bir biyografi metnidir.",
  longBio: "",
  location: HIDDEN_LOCATION,
  email: "hidden-phase4@example.com",
  isEmailVisible: false,
  isLocationVisible: false,
  availableForWork: true,
};

await check("profil oluşturma (upsert) başarılı", async () => {
  const response = await request("/api/admin/profile", { method: "PUT", body: JSON.stringify(profileBody) }, cookie);
  assert.equal(response.status, 200);
});

let visibleSkillId, hiddenSkillId;
await check("skill create/update/delete", async () => {
  const visibleResponse = await request("/api/admin/skills", { method: "POST", body: JSON.stringify({ name: VISIBLE_SKILL, slug: "gorunur-yetenek-test", category: "Test", description: "", isVisible: true }) }, cookie);
  assert.equal(visibleResponse.status, 201);
  visibleSkillId = (await visibleResponse.json()).id;

  const hiddenResponse = await request("/api/admin/skills", { method: "POST", body: JSON.stringify({ name: HIDDEN_SKILL, slug: "gizli-yetenek-test", category: "Test", description: "", isVisible: false }) }, cookie);
  assert.equal(hiddenResponse.status, 201);
  hiddenSkillId = (await hiddenResponse.json()).id;

  const disposable = await request("/api/admin/skills", { method: "POST", body: JSON.stringify({ name: "Disposable Skill", slug: "disposable-skill-test", category: "Test", description: "", isVisible: true }) }, cookie);
  const disposableId = (await disposable.json()).id;
  const updateResponse = await request(`/api/admin/skills/${disposableId}`, { method: "PATCH", body: JSON.stringify({ name: "Disposable Skill Updated", slug: "disposable-skill-test", category: "Test", description: "", isVisible: true }) }, cookie);
  assert.equal(updateResponse.status, 200);
  const deleteResponse = await request(`/api/admin/skills/${disposableId}`, { method: "DELETE" }, cookie);
  assert.equal(deleteResponse.status, 204);
});

let educationId;
await check("education create/update/delete", async () => {
  const createResponse = await request("/api/admin/education", { method: "POST", body: JSON.stringify({ institution: "Phase4 Universitesi", program: "Test Bolumu", startDate: "2018-09-01", endDate: "2022-06-30", isCurrent: false, description: "", isVisible: true }) }, cookie);
  assert.equal(createResponse.status, 201);
  educationId = (await createResponse.json()).id;
  const updateResponse = await request(`/api/admin/education/${educationId}`, { method: "PATCH", body: JSON.stringify({ institution: "Phase4 Universitesi Guncel", program: "Test Bolumu", startDate: "2018-09-01", endDate: "2022-06-30", isCurrent: false, description: "", isVisible: true }) }, cookie);
  assert.equal(updateResponse.status, 200);

  const disposable = await request("/api/admin/education", { method: "POST", body: JSON.stringify({ institution: "Disposable Uni", program: "Genel", startDate: "2010-01-01", endDate: "2012-01-01", isCurrent: false, description: "", isVisible: true }) }, cookie);
  const disposableId = (await disposable.json()).id;
  const deleteResponse = await request(`/api/admin/education/${disposableId}`, { method: "DELETE" }, cookie);
  assert.equal(deleteResponse.status, 204);
});

await check("experience create/update/delete", async () => {
  const createResponse = await request("/api/admin/experience", { method: "POST", body: JSON.stringify({ organization: "Phase4 Sirketi", position: "Test Muhendisi", startDate: "2022-07-01", endDate: "", isCurrent: true, description: "", isVisible: true }) }, cookie);
  assert.equal(createResponse.status, 201);
  const experienceId = (await createResponse.json()).id;
  const updateResponse = await request(`/api/admin/experience/${experienceId}`, { method: "PATCH", body: JSON.stringify({ organization: "Phase4 Sirketi", position: "Kidemli Test Muhendisi", startDate: "2022-07-01", endDate: "", isCurrent: true, description: "", isVisible: true }) }, cookie);
  assert.equal(updateResponse.status, 200);
  const deleteResponse = await request(`/api/admin/experience/${experienceId}`, { method: "DELETE" }, cookie);
  assert.equal(deleteResponse.status, 204);
});

const projectBase = {
  shortDescription: "Phase4 HTTP entegrasyon testinde kullanılan yeterince uzun açıklama.",
  detailedDescription: "", problem: "", solution: "", role: "", architectureDescription: "",
  status: "completed", projectDate: "2026-01-01", liveUrl: "", repositoryVisibility: "none", repositoryUrl: "",
  featured: false, published: true,
};

let cvProjectId, unpublishedProjectId;
await check("CV projesi ve yayınlanmamış proje oluşturulur", async () => {
  const cvProject = await request("/api/admin/projects", { method: "POST", body: JSON.stringify({ ...projectBase, title: CV_PROJECT_TITLE, slug: "phase4-cv-projesi", includeInCv: true, skillIds: [visibleSkillId] }) }, cookie);
  assert.equal(cvProject.status, 201);
  cvProjectId = (await cvProject.json()).id;

  const unpublished = await request("/api/admin/projects", { method: "POST", body: JSON.stringify({ ...projectBase, title: UNPUBLISHED_PROJECT_TITLE, slug: "phase4-yayinlanmamis-proje", published: false, includeInCv: true, skillIds: [] }) }, cookie);
  assert.equal(unpublished.status, 201);
  unpublishedProjectId = (await unpublished.json()).id;
});

await check("cv ayarları kaydedilir", async () => {
  const response = await request(
    "/api/admin/cv/settings",
    { method: "PUT", body: JSON.stringify({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionVisibility: {}, sectionOrder: ["summary", "skills", "projects", "experience", "education"], maxProjects: 6 }) },
    cookie,
  );
  assert.equal(response.status, 200);
});

// ---- public privacy leakage checks ----

await check("public /cv: gizli email ve konum sızmıyor, görünür yetenek/CV projesi var, gizli yetenek/yayınlanmamış proje yok", async () => {
  const html = await (await request("/cv")).text();
  assert.doesNotMatch(html, /hidden-phase4@example\.com/);
  assert.doesNotMatch(html, new RegExp(HIDDEN_LOCATION));
  assert.doesNotMatch(html, new RegExp(HIDDEN_SKILL));
  assert.doesNotMatch(html, new RegExp(UNPUBLISHED_PROJECT_TITLE));
  assert.match(html, new RegExp(VISIBLE_SKILL));
  assert.match(html, new RegExp(CV_PROJECT_TITLE));
  assert.match(html, /Phase4 Test Kisisi/);
});

// ---- PDF endpoint ----

let pdfBuffer;
await check("PDF endpoint 200, doğru header'lar, boş olmayan gövde, %PDF imzası", async () => {
  const response = await request("/api/cv/pdf");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /application\/pdf/);
  // 1.9.0: default is inline (open in browser); ?download=1 is the attachment variant.
  assert.match(response.headers.get("content-disposition") ?? "", /^inline; filename="[a-z0-9-]+\.pdf"$/);
  const download = await request("/api/cv/pdf?download=1");
  assert.match(download.headers.get("content-disposition") ?? "", /^attachment; filename="[a-z0-9-]+\.pdf"$/);
  await download.arrayBuffer();
  const arrayBuffer = await response.arrayBuffer();
  pdfBuffer = Buffer.from(arrayBuffer);
  if (process.env.TEST_PDF_OUTPUT) { const { writeFile } = await import("node:fs/promises"); await writeFile(process.env.TEST_PDF_OUTPUT.replace(/\.pdf$/, "-phase4.pdf"), pdfBuffer); }
  assert.ok(pdfBuffer.length > 500, "PDF gövdesi beklenenden küçük");
  assert.equal(pdfBuffer.subarray(0, 4).toString("latin1"), "%PDF");
});

await check("PDF metin çıkarımı: isim, bölüm başlığı, görünür yetenek ve CV projesi metin olarak bulunuyor; gizli alanlar bulunmuyor", async () => {
  const text = extractPdfText(pdfBuffer);
  assert.match(text, /Phase4 Test Kisisi/);
  assert.match(text, /Phase4 HTTP Test Headline/);
  assert.match(text, /yetenekler/i);
  assert.match(text, new RegExp(VISIBLE_SKILL));
  assert.match(text, new RegExp(CV_PROJECT_TITLE));
  assert.doesNotMatch(text, new RegExp(HIDDEN_SKILL));
  assert.doesNotMatch(text, new RegExp(HIDDEN_LOCATION));
  assert.doesNotMatch(text, /hidden-phase4@example\.com/);
});

// ---- single-source-of-truth consistency: web CV and PDF reflect the same DB change ----

const UPDATED_HEADLINE = "Phase4 Guncellenmis Headline Tek Kaynak Testi";
await check("tutarlılık: profile headline değişikliği hem /cv hem PDF'e aynı anda yansır", async () => {
  const updateResponse = await request("/api/admin/profile", { method: "PUT", body: JSON.stringify({ ...profileBody, headline: UPDATED_HEADLINE }) }, cookie);
  assert.equal(updateResponse.status, 200);

  const html = await (await request("/cv")).text();
  assert.match(html, new RegExp(UPDATED_HEADLINE));

  const pdfResponse = await request("/api/cv/pdf");
  const updatedPdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
  const text = extractPdfText(updatedPdfBuffer);
  assert.match(text, new RegExp(UPDATED_HEADLINE));
});

// ---- section visibility toggle ----

await check("cv settings: bölüm görünürlüğü kapatılınca public CV'den kalkar", async () => {
  const response = await request(
    "/api/admin/cv/settings",
    { method: "PUT", body: JSON.stringify({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionVisibility: { skills: false }, sectionOrder: ["summary", "skills", "projects", "experience", "education"], maxProjects: 6 }) },
    cookie,
  );
  assert.equal(response.status, 200);
  const html = await (await request("/cv")).text();
  // The standalone Skills section heading must be gone; the skill's name may
  // still legitimately appear as a tech tag under the Projects section entry.
  assert.doesNotMatch(html, /id="cv-skills"/);
});

// ---- cleanup ----

await check("test fixture temizliği", async () => {
  assert.equal((await request(`/api/admin/projects/${cvProjectId}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/api/admin/projects/${unpublishedProjectId}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/api/admin/education/${educationId}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/api/admin/skills/${visibleSkillId}`, { method: "DELETE" }, cookie)).status, 204);
  assert.equal((await request(`/api/admin/skills/${hiddenSkillId}`, { method: "DELETE" }, cookie)).status, 204);
});

console.log(`Completed ${checks.length} Phase 4 HTTP checks.`);
