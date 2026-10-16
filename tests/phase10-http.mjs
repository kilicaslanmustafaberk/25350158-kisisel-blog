import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { extractPdfText } from "./pdf-text-extract.mjs";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const request = (path, body, cookie = "", method = "POST") => fetch(base + path, { method: body ? method : "GET", headers: { Origin: base, "Content-Type": "application/json", Cookie: cookie }, body: body ? JSON.stringify(body) : undefined });
let count = 0;
const check = async (name, run) => { await run(); console.log(`PASS ${name}`); count++; };
const login = await request("/api/auth/sign-in/email", { email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
assert.equal(login.status, 200);
const cookie = login.headers.getSetCookie().map((v) => v.split(";", 1)[0]).join("; ");
const alphabet = "Ğ ğ Ü ü Ş ş İ ı Ö ö Ç ç";
const profile = { fullName: "Deniz Öğrenci", headline: "Bilgisayar Programcılığı Öğrencisi", shortBio: "Hero için benzersiz kısa tanıtım cümlesi.", longBio: `Yazılım geliştirmeyi ve erişilebilir deneyimler tasarlamayı seviyorum. ${alphabet}`, email: "deniz@example.com", location: "İstanbul", phone: "+90 (532) 123-45-67", isPhoneVisible: true, isEmailVisible: true, isLocationVisible: true, availableForWork: true };
await check("profile phone update and invalid phone rejection", async () => {
  assert.equal((await request("/api/admin/profile", profile, cookie, "PUT")).status, 200);
  assert.equal((await request("/api/admin/profile", { ...profile, phone: "javascript:alert(1)" }, cookie, "PUT")).status, 400);
});
let educationId;
await check("education blank program create/update", async () => {
  const body = { institution: "Örnek Ortaokulu", program: "", startDate: "2015-09-01", endDate: "2018-06-01", isCurrent: false, description: "--", isVisible: true };
  const response = await request("/api/admin/education", body, cookie);
  assert.equal(response.status, 201); educationId = (await response.json()).id;
  assert.equal((await request(`/api/admin/education/${educationId}`, body, cookie, "PATCH")).status, 200);
  assert.equal((await request("/api/admin/experience", { organization: "Örnek Teknoloji", position: "Yazılım Geliştirici", startDate: "2024-01-01", endDate: "2025-01-01", isCurrent: false, description: "Erişilebilir web uygulamaları geliştirdim.", isVisible: true }, cookie)).status, 201);
});
await check("Instagram website-visible but CV-excluded; GitHub default CV-visible", async () => {
  assert.equal((await request("/api/admin/social-links", { platform: "instagram", label: "Instagram", url: "https://www.instagram.com/phase10-private-cv", isVisible: true, showInCv: false }, cookie)).status, 201);
  assert.equal((await request("/api/admin/social-links", { platform: "github", label: "GitHub", url: "https://github.com/octocat", isVisible: true }, cookie)).status, 201);
  assert.equal((await request("/api/admin/social-links", { platform: "other", label: "Bad", url: "javascript:alert(1)", isVisible: true }, cookie)).status, 400);
});
await request("/api/admin/cv/settings", { title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionVisibility: {}, sectionOrder: ["summary", "experience", "education", "projects", "skills"], maxProjects: 6 }, cookie, "PUT");
await check("landing Hero once; About separate; phone/social public; project excluded from career timeline", async () => {
  assert.equal((await request("/api/admin/projects", { title: "Erişilebilir Portfolyo", slug: "phase10-portfolio", shortDescription: "İçerik yönetimi ve erişilebilir kullanıcı deneyimi üzerine bir portfolyo uygulaması.", detailedDescription: "", problem: "", solution: "", role: "Geliştirici", architectureDescription: "", status: "completed", projectDate: "2026-09-01", liveUrl: "", repositoryVisibility: "none", repositoryUrl: "", featured: true, published: true, includeInCv: true, skillIds: ["11111111-1111-4111-8111-111111111111"] }, cookie)).status, 201);
  const html = await (await request("/")).text();
  const timeline = /<section[^>]*id="journey"[\s\S]*?<\/section>/.exec(html)?.[0];
  assert.ok(timeline, "Career timeline must exist");
  assert.match(html, /Erişilebilir Portfolyo/);
  assert.doesNotMatch(timeline, /Erişilebilir Portfolyo/);
  assert.match(timeline, /Örnek Ortaokulu/);
  assert.match(timeline, /Yazılım Geliştirici/);
  // HTML visible text only; RSC transport serialization is not another display.
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "");
  assert.equal(visible.split(profile.shortBio).length - 1, 1);
  assert.doesNotMatch(visible, /Kısa Profil|v0\.8|command \+ terminal/);
  assert.match(html, /tel:\+905321234567/);
  assert.match(html, /phase10-private-cv/);
});
await check("CV entire HTML/RSC excludes Instagram, Hero text and placeholders", async () => {
  const html = await (await request("/cv")).text();
  assert.doesNotMatch(html, /phase10-private-cv|Hero için benzersiz/);
  assert.match(html, /tel:\+905321234567/);
  assert.match(html, /github.com\/octocat/);
  assert.match(html, /Örnek Ortaokulu/);
  assert.doesNotMatch(html, /<p>--<\/p>/);
});
await check("PDF Unicode extraction, visible phone, no Instagram", async () => {
  const response = await request("/api/cv/pdf"); assert.equal(response.status, 200);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (process.env.TEST_PDF_OUTPUT) await writeFile(process.env.TEST_PDF_OUTPUT, buffer);
  const text = extractPdfText(buffer);
  assert.match(text, /Bilgisayar Programcılığı Öğrencisi/);
  for (const char of alphabet.replaceAll(" ", "")) assert.ok(text.includes(char), `Missing Unicode character ${char}`);
  assert.match(text, /\+90 \(532\) 123-45-67/);
  assert.doesNotMatch(text, /instagram|--/i);
  if (process.env.TEST_PDF_OUTPUT) await writeFile(process.env.TEST_PDF_OUTPUT, buffer);
});
await check("hidden phone absent from whole CV and landing payloads", async () => {
  assert.equal((await request("/api/admin/profile", { ...profile, isPhoneVisible: false }, cookie, "PUT")).status, 200);
  for (const path of ["/", "/cv"]) assert.doesNotMatch(await (await request(path)).text(), /905321234567|532\) 123/);
  const text = extractPdfText(Buffer.from(await (await request("/api/cv/pdf")).arrayBuffer()));
  assert.doesNotMatch(text, /905321234567|532\) 123/);
  await request("/api/admin/profile", profile, cookie, "PUT");
});
console.log(`Completed ${count} Phase 10 HTTP checks.`);
