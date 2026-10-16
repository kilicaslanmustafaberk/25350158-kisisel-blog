import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSocialUrl, socialLinkInputSchema } from "../src/features/social/validation";

const valid = { platform: "github", label: "GitHub", url: "https://github.com/octocat", isVisible: true };

test("social URL accepts credential-free https only", () => {
  assert.equal(normalizeSocialUrl("https://www.linkedin.com/in/example"), "https://www.linkedin.com/in/example");
  for (const hostile of [
    "javascript:alert(1)", "JAVASCRIPT:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "http://example.com", "mailto:a@example.com",
    "https://user:pass@example.com", "//example.com", "example.com", "https://localhost", "ftp://example.com",
  ]) assert.equal(normalizeSocialUrl(hostile), null, hostile);
});

test("social link schema validates platform, label and url", () => {
  const parsed = socialLinkInputSchema.safeParse(valid);
  assert.ok(parsed.success);
  assert.equal(parsed.data?.url, "https://github.com/octocat");
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, url: "javascript:alert(1)" }).success, false);
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, url: "not a url" }).success, false);
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, platform: "<svg onload=alert(1)>" }).success, false);
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, label: "" }).success, false);
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, isVisible: "yes" }).success, false);
});

test("GitHub platform requires a profile URL usable by the GitHub integration", () => {
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, url: "https://github.com/octocat/Hello-World" }).success, false);
  assert.equal(socialLinkInputSchema.safeParse({ ...valid, url: "https://gitlab.com/octocat" }).success, false);
  assert.ok(socialLinkInputSchema.safeParse({ ...valid, platform: "website", url: "https://github.com/octocat/Hello-World" }).success);
});
