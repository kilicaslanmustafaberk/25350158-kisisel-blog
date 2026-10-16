import assert from "node:assert/strict";
import test from "node:test";
import { cvContactParts, cvSummary, displayExternalUrl, displayOptionalText, normalizePhone, phoneHref, phoneInputSchema } from "../src/features/cv/contact";
import { educationInputSchema } from "../src/features/cv/validation";
import { defaultShowInCv, socialPlatformValues } from "../src/features/social/validation";
import { ambientProgress } from "../src/features/motion/ambient";

test("international phone validation and safe tel URI", () => {
  assert.equal(normalizePhone("+90 (532) 123-45-67"), "+905321234567");
  assert.equal(phoneHref("+44 20 7946 0958"), "tel:+442079460958");
  for (const value of ["javascript:alert(1)", "+12", "1234567890123456", "90+123456789"]) assert.equal(phoneInputSchema.safeParse(value).success, false);
  assert.equal(phoneInputSchema.parse("  "), null);
});
test("summary never falls back to Hero and contact has no empty separators", () => {
  assert.equal(cvSummary("Override", "About"), "Override");
  assert.equal(cvSummary("", "About"), "About");
  assert.equal(cvSummary(null, null), "");
  assert.deepEqual(cvContactParts({ email: null, phone: "+905321234567", location: "" }), ["+905321234567"]);
});
test("education accepts blank program and suppresses legacy placeholders", () => {
  assert.equal(educationInputSchema.parse({ institution: "Ortaokul", program: "  ", startDate: "2010-09-01", endDate: "", isCurrent: false, description: "", isVisible: true }).program, "");
  for (const value of ["--", "-", " – ", ""]) assert.equal(displayOptionalText(value), "");
});
test("social platforms have independent professional CV defaults", () => {
  for (const platform of ["instagram", "behance", "dribbble", "youtube", "x"]) { assert.ok(socialPlatformValues.includes(platform as typeof socialPlatformValues[number])); assert.equal(defaultShowInCv(platform as typeof socialPlatformValues[number]), false); }
  for (const platform of ["github", "linkedin", "website"]) assert.equal(defaultShowInCv(platform as typeof socialPlatformValues[number]), true);
});

test("CV displays readable Unicode URLs while preserving safe link targets", () => {
  assert.equal(displayExternalUrl("https://www.linkedin.com/in/k%C4%B1l%C4%B1%C3%A7aslan/"), "www.linkedin.com/in/kılıçaslan/");
  assert.equal(displayExternalUrl("https://example.com/a%2Fb"), "example.com/a%2Fb");
});
test("ambient scroll progress is bounded and handles short pages", () => {
  assert.equal(ambientProgress(500, 2000, 1000), .5);
  assert.equal(ambientProgress(-20, 2000, 1000), 0);
  assert.equal(ambientProgress(3000, 2000, 1000), 1);
  assert.equal(ambientProgress(0, 500, 800), 0);
});
