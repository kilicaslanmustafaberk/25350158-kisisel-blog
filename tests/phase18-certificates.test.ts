import assert from "node:assert/strict";
import test from "node:test";

import {
  LANDING_CERTIFICATE_LIMIT,
  buildPublicCertificates,
  certificatePrimaryMeta,
  certificateSecondaryMeta,
  compareCertificates,
  formatCertificateDate,
  toPublicCertificate,
  type CertificateRow,
} from "../src/features/certificates/display";
import { certificateInputSchema, normalizeCredentialUrl } from "../src/features/certificates/validation";
import { renderableSections } from "../src/features/cv/section-visibility";
import { cvSectionIds, cvSettingsInputSchema } from "../src/features/cv/validation";
import type { PublicCvData } from "../src/server/cv/repository";

const base = { title: "İleri Seviye Ağ Teknolojileri", isVisible: true, showInCv: true };
const row = (overrides: Partial<CertificateRow> = {}): CertificateRow => ({
  id: "c1", title: "Sertifika", issuer: null, instructor: null, issuedAt: null, expiresAt: null,
  credentialId: null, credentialUrl: null, description: null, displayOrder: 0, ...overrides,
});

test("only the certificate name is required; every other field may be blank", () => {
  const minimal = certificateInputSchema.parse(base);
  assert.equal(minimal.title, "İleri Seviye Ağ Teknolojileri");
  for (const key of ["issuer", "instructor", "issuedAt", "expiresAt", "credentialId", "credentialUrl", "description"] as const) assert.equal(minimal[key], null, key);
  const blanks = certificateInputSchema.parse({ ...base, issuer: "  ", instructor: "", issuedAt: "", expiresAt: "", credentialId: " ", credentialUrl: "", description: "" });
  assert.equal(blanks.issuer, null); assert.equal(blanks.credentialId, null); assert.equal(blanks.issuedAt, null);
  assert.equal(certificateInputSchema.safeParse({ ...base, title: "" }).success, false);
  assert.equal(certificateInputSchema.safeParse({ ...base, title: " a " }).success, false);
  assert.equal(certificateInputSchema.safeParse({ title: "Sertifika" }).success, false, "visibility flags are explicit");
});

test("dates are optional ISO dates and expiry cannot precede issue", () => {
  assert.equal(certificateInputSchema.safeParse({ ...base, issuedAt: "2026-02-30x" }).success, false);
  assert.equal(certificateInputSchema.safeParse({ ...base, issuedAt: "01/2026" }).success, false);
  assert.equal(certificateInputSchema.safeParse({ ...base, issuedAt: "2026-05-01", expiresAt: "2026-04-01" }).success, false);
  assert.equal(certificateInputSchema.safeParse({ ...base, issuedAt: "2026-05-01", expiresAt: "2028-05-01" }).success, true);
  assert.equal(certificateInputSchema.safeParse({ ...base, expiresAt: "2028-05-01" }).success, true, "expiry alone is allowed");
});

test("credential URL accepts credential-free https only", () => {
  assert.equal(certificateInputSchema.parse({ ...base, credentialUrl: "https://www.btkakademi.gov.tr/sertifika/ABC-123" }).credentialUrl, "https://www.btkakademi.gov.tr/sertifika/ABC-123");
  for (const url of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,<script>x</script>", "vbscript:msgbox(1)", "http://example.com/c", "ftp://example.com/c", "custom-app://open", "https://user:pass@example.com/c", "https://localhost/c", "not a url", "https://exa mple.com", " java\tscript:alert(1)"]) {
    const result = certificateInputSchema.safeParse({ ...base, credentialUrl: url });
    assert.equal(result.success, false, url);
    if (!result.success) assert.ok(result.error.flatten().fieldErrors.credentialUrl?.length, url);
    assert.equal(normalizeCredentialUrl(url), null, url);
  }
});

test("unknown keys are stripped (no mass assignment of id/order/timestamps)", () => {
  const parsed = certificateInputSchema.parse({ ...base, id: "x", displayOrder: 99, createdAt: 1, isAdmin: true }) as Record<string, unknown>;
  for (const key of ["id", "displayOrder", "createdAt", "isAdmin"]) assert.equal(key in parsed, false, key);
});

test("public DTO drops placeholders, invalid dates and unsafe stored links", () => {
  const dto = toPublicCertificate(row({ issuer: " -- ", instructor: "—", credentialId: "  ", description: "-", issuedAt: "bad", credentialUrl: "javascript:alert(1)" }));
  assert.deepEqual(dto, { id: "c1", title: "Sertifika", issuer: null, instructor: null, issuedAt: null, expiresAt: null, credentialId: null, credentialUrl: null, description: null });
  assert.equal("isVisible" in dto || "showInCv" in dto || "displayOrder" in dto, false);
});

test("ordering is deterministic: display order, newest issue date, undated last, then title/id", () => {
  const rows = [
    row({ id: "d", title: "B", displayOrder: 1 }),
    row({ id: "a", title: "A", displayOrder: 1, issuedAt: "2024-01-01" }),
    row({ id: "b", title: "C", displayOrder: 1, issuedAt: "2026-01-01" }),
    row({ id: "c", title: "Z", displayOrder: 0 }),
    row({ id: "e", title: "B", displayOrder: 1 }),
  ];
  assert.deepEqual([...rows].sort(compareCertificates).map((item) => item.id), ["c", "b", "a", "d", "e"]);
  assert.deepEqual(buildPublicCertificates([...rows].reverse()).map((item) => item.id), ["c", "b", "a", "d", "e"]);
  assert.equal(buildPublicCertificates(rows, LANDING_CERTIFICATE_LIMIT).length, LANDING_CERTIFICATE_LIMIT);
});

test("meta lines never render empty separators or placeholders", () => {
  const empty = toPublicCertificate(row());
  assert.equal(certificatePrimaryMeta(empty), "");
  assert.deepEqual(certificateSecondaryMeta(empty, "tr"), []);
  assert.equal(certificatePrimaryMeta(toPublicCertificate(row({ issuer: "BTK Akademi" }))), "BTK Akademi");
  assert.equal(certificatePrimaryMeta(toPublicCertificate(row({ issuedAt: "2026-03-15" }))), "03/2026");
  assert.equal(certificatePrimaryMeta(toPublicCertificate(row({ issuer: "BTK Akademi", issuedAt: "2026-03-15" }))), "BTK Akademi · 03/2026");
  const full = toPublicCertificate(row({ instructor: "Öğrenci Eğitmen", expiresAt: "2028-01-01", credentialId: "ABC-123" }));
  assert.deepEqual(certificateSecondaryMeta(full, "tr"), ["Eğitmen: Öğrenci Eğitmen", "Geçerlilik: 01/2028", "Sertifika No: ABC-123"]);
  assert.equal(formatCertificateDate(null), null);
  for (const text of [certificatePrimaryMeta(full), ...certificateSecondaryMeta(full, "tr")]) assert.doesNotMatch(text, /(^|\s)[-–—](\s|$)|: $|·\s*$/);
});

const cv = (certificates: PublicCvData["certificates"], visibility: Record<string, boolean> = {}): PublicCvData => ({
  title: "Özgeçmiş", language: "tr", summary: "", profile: { fullName: "Test", headline: "Test", location: null, email: null, availableForWork: false, avatarUrl: null },
  skills: [], projects: [], experience: [], education: [], certificates, socialLinks: [],
  sectionOrder: [...cvSectionIds], sectionVisibility: visibility,
});

test("CV builder: certificates section renders only when non-empty and not hidden", () => {
  assert.equal(renderableSections(cv([])).includes("certificates"), false);
  const one = [toPublicCertificate(row({ title: "İleri Seviye Ağ Teknolojileri", issuer: "BTK Akademi" }))];
  assert.deepEqual(renderableSections(cv(one)), ["certificates"]);
  assert.deepEqual(renderableSections(cv(one, { certificates: false })), []);
});

test("CV settings accept and auto-complete the certificates section", () => {
  const parsed = cvSettingsInputSchema.parse({ title: "Özgeçmiş", summaryOverride: "", language: "tr", sectionOrder: ["certificates"], maxProjects: 6 });
  assert.equal(parsed.sectionOrder[0], "certificates");
  assert.equal(new Set(parsed.sectionOrder).size, cvSectionIds.length);
});
