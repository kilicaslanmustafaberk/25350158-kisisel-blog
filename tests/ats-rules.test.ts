import assert from "node:assert/strict";
import test from "node:test";

import { calculateAtsScore, evaluateAtsRules } from "../src/features/cv/ats-rules";
import type { PublicCvData } from "../src/server/cv/repository";

const completeCv: PublicCvData = {
  title: "Özgeçmiş",
  language: "tr",
  summary: "Beş yıllık deneyime sahip full-stack geliştirici; ölçeklenebilir web uygulamaları ve güvenli sistemler üzerine odaklanır.",
  profile: { fullName: "Berk Karademir", headline: "Full-stack Developer", location: "İstanbul", email: "berk@example.com", availableForWork: true, avatarUrl: null },
  skills: [
    { id: "s1", name: "TypeScript", category: "Frontend" },
    { id: "s2", name: "Node.js", category: "Backend" },
    { id: "s3", name: "PostgreSQL", category: "Backend" },
  ],
  projects: [{ id: "p1", title: "Portfolyo Sitesi", slug: "portfolyo-sitesi", shortDescription: "Next.js tabanlı portfolyo.", projectDate: "2026-01-01", skills: [{ name: "Next.js" }] }],
  experience: [{ id: "e1", organization: "Örnek A.Ş.", position: "Yazılım Mühendisi", startDate: "2022-01-01", endDate: null, isCurrent: true, description: "Backend geliştirme." }],
  education: [{ id: "ed1", institution: "Örnek Üniversitesi", program: "Bilgisayar Mühendisliği", startDate: "2018-09-01", endDate: "2022-06-30", isCurrent: false, description: null }],
  certificates: [],
  socialLinks: [],
  sectionOrder: ["summary", "skills", "projects", "experience", "education", "certificates"],
  sectionVisibility: {},
};

const minimalCv: PublicCvData = {
  ...completeCv,
  summary: "",
  skills: [],
  projects: [],
  education: [],
  experience: [],
  profile: { ...completeCv.profile, email: null },
};

test("eksiksiz CV yüksek skor alır", () => {
  const results = evaluateAtsRules(completeCv);
  const score = calculateAtsScore(results);
  assert.ok(score.score >= 90, `beklenen >=90, alınan ${score.score}`);
  assert.ok(results.every((result) => result.status !== "fail"));
});

test("eksik email uyarı üretir, hata üretmez", () => {
  const results = evaluateAtsRules(minimalCv);
  const emailRule = results.find((result) => result.id === "contact-email");
  assert.equal(emailRule?.status, "warning");
});

test("eğitim eksikliği uyarı üretir", () => {
  const results = evaluateAtsRules(minimalCv);
  const rule = results.find((result) => result.id === "education-present");
  assert.equal(rule?.status, "warning");
});

test("skill yokluğu başarısız (fail) sayılır", () => {
  const results = evaluateAtsRules(minimalCv);
  const rule = results.find((result) => result.id === "skills-present");
  assert.equal(rule?.status, "fail");
});

test("aşırı uzun özet uyarı üretir", () => {
  const longSummary = "a".repeat(700);
  const results = evaluateAtsRules({ ...completeCv, summary: longSummary });
  const rule = results.find((result) => result.id === "summary-length");
  assert.equal(rule?.status, "warning");
});

test("deneyim yokken tarih tutarlılık kuralı uygulanamaz sayılır", () => {
  const results = evaluateAtsRules(minimalCv);
  const rule = results.find((result) => result.id === "experience-dates-consistent");
  assert.equal(rule?.applicable, false);
});

test("skor deterministiktir: aynı girdi aynı skoru üretir", () => {
  const first = calculateAtsScore(evaluateAtsRules(completeCv));
  const second = calculateAtsScore(evaluateAtsRules(completeCv));
  assert.equal(first.score, second.score);
});

test("skor formülü: uygulanamayan kurallar hesaba katılmaz", () => {
  const results = evaluateAtsRules(minimalCv);
  const score = calculateAtsScore(results);
  const applicable = results.filter((result) => result.applicable);
  const expectedWeight = applicable.reduce((sum, result) => sum + result.weight, 0);
  assert.equal(score.applicableWeight, expectedWeight);
});
