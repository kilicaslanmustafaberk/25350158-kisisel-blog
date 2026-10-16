import assert from "node:assert/strict";
import test from "node:test";

import { cvSettingsInputSchema, educationInputSchema, experienceInputSchema, profileInputSchema, skillInputSchema } from "../src/features/cv/validation";

const validProfile = {
  fullName: "Berk Karademir",
  headline: "Full-stack Developer",
  shortBio: "Yeterince uzun ve doğrulama testinde kullanılan bir kısa biyografi metni.",
  longBio: "",
  location: "İstanbul",
  email: "berk@example.com",
  isEmailVisible: true,
  isLocationVisible: false,
  availableForWork: true,
};

test("profil whitelist şeması geçerli payload'u normalize eder", () => {
  const result = profileInputSchema.parse(validProfile);
  assert.equal(result.longBio, null);
  assert.equal(result.isLocationVisible, false);
});

test("geçersiz email reddedilir", () => {
  assert.equal(profileInputSchema.safeParse({ ...validProfile, email: "not-an-email" }).success, false);
});

const validEducation = {
  institution: "Örnek Üniversitesi",
  program: "Bilgisayar Mühendisliği",
  startDate: "2020-09-01",
  endDate: "2024-06-30",
  isCurrent: false,
  description: "",
  isVisible: true,
};

test("eğitim: bitiş başlangıçtan önce olamaz", () => {
  assert.equal(educationInputSchema.safeParse({ ...validEducation, startDate: "2024-09-01", endDate: "2020-06-30" }).success, false);
});

test("eğitim: devam ediyorken bitiş tarihi olamaz", () => {
  assert.equal(educationInputSchema.safeParse({ ...validEducation, isCurrent: true, endDate: "2024-06-30" }).success, false);
});

test("eğitim: devam eden kayıt boş bitiş tarihiyle geçerlidir", () => {
  const result = educationInputSchema.safeParse({ ...validEducation, isCurrent: true, endDate: "" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.endDate, null);
});

const validExperience = {
  organization: "Örnek Şirket",
  position: "Yazılım Mühendisi",
  startDate: "2024-01-01",
  endDate: "",
  isCurrent: true,
  description: "",
  isVisible: true,
};

test("deneyim: devam ediyorken bitiş tarihi olamaz", () => {
  assert.equal(experienceInputSchema.safeParse({ ...validExperience, endDate: "2025-01-01" }).success, false);
});

test("deneyim: bitiş başlangıçtan önce olamaz", () => {
  assert.equal(experienceInputSchema.safeParse({ ...validExperience, isCurrent: false, startDate: "2024-06-01", endDate: "2024-01-01" }).success, false);
});

test("skill: geçersiz slug reddedilir", () => {
  assert.equal(skillInputSchema.safeParse({ name: "TypeScript", slug: "Type Script", category: "Frontend", description: "", isVisible: true }).success, false);
});

test("skill: geçerli payload kabul edilir", () => {
  assert.equal(skillInputSchema.safeParse({ name: "TypeScript", slug: "typescript", category: "Frontend", description: "", isVisible: true }).success, true);
});

test("cv settings: geçersiz section order/visibility reddedilir", () => {
  assert.equal(
    cvSettingsInputSchema.safeParse({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionOrder: ["not-a-section"], maxProjects: 6 }).success,
    false,
  );
  assert.equal(
    cvSettingsInputSchema.safeParse({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionOrder: ["summary"], sectionVisibility: { summary: true }, maxProjects: 6 }).success,
    true,
  );
});

test("cv settings: eksik section order otomatik tamamlanır", () => {
  const result = cvSettingsInputSchema.parse({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionOrder: ["skills"], maxProjects: 6 });
  assert.deepEqual(result.sectionOrder, ["skills", "summary", "experience", "education", "certificates", "projects"]);
});

test("cv settings: maxProjects sınırı", () => {
  assert.equal(cvSettingsInputSchema.safeParse({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionOrder: [], maxProjects: 0 }).success, false);
  assert.equal(cvSettingsInputSchema.safeParse({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionOrder: [], maxProjects: 21 }).success, false);
});
