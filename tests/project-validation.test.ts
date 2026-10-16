import assert from "node:assert/strict";
import test from "node:test";

import {
  maxProjectImageBytes,
  projectInputSchema,
  toSlug,
  uploadRequestSchema,
} from "../src/features/projects/validation";

const validProject = {
  title: "Güvenli Portfolyo",
  slug: "guvenli-portfolyo",
  shortDescription: "Doğrulama testinde kullanılan yeterince uzun açıklama.",
  detailedDescription: "",
  problem: "",
  solution: "",
  role: "Full-stack",
  architectureDescription: "",
  status: "completed",
  projectDate: "2026-09-23",
  liveUrl: "https://example.com",
  repositoryVisibility: "private",
  repositoryUrl: "https://github.com/example/private",
  featured: true,
  published: false,
  includeInCv: false,
  skillIds: [],
};

test("project whitelist schema valid payload'u normalize eder", () => {
  const result = projectInputSchema.parse(validProject);
  assert.equal(result.detailedDescription, null);
  assert.equal(result.repositoryVisibility, "private");
});

test("geçersiz slug ve URL reddedilir", () => {
  assert.equal(projectInputSchema.safeParse({ ...validProject, slug: "Geçersiz Slug" }).success, false);
  assert.equal(projectInputSchema.safeParse({ ...validProject, liveUrl: "javascript:alert(1)" }).success, false);
});

test("public repository URL ister, none URL kabul etmez", () => {
  assert.equal(projectInputSchema.safeParse({ ...validProject, repositoryVisibility: "public", repositoryUrl: "" }).success, false);
  assert.equal(projectInputSchema.safeParse({ ...validProject, repositoryVisibility: "none" }).success, false);
});

test("MIME allowlist SVG/GIF'i ve 5 MB üstünü reddeder", () => {
  assert.equal(uploadRequestSchema.safeParse({ mimeType: "image/svg+xml", size: 100 }).success, false);
  assert.equal(uploadRequestSchema.safeParse({ mimeType: "image/gif", size: 100 }).success, false);
  assert.equal(uploadRequestSchema.safeParse({ mimeType: "image/webp", size: maxProjectImageBytes + 1 }).success, false);
  assert.equal(uploadRequestSchema.safeParse({ mimeType: "image/png", size: maxProjectImageBytes }).success, true);
});

test("Türkçe başlık güvenli slug'a dönüşür", () => {
  assert.equal(toSlug("İş Ölçeği: Güçlü Çözüm"), "is-olcegi-guclu-cozum");
});
