import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { cvContentDisposition, cvPdfKeySchema, hasPdfSignature } from "../src/features/cv/uploaded-pdf";
import { parseR2TestEndpoint } from "../src/features/media/r2-test-endpoint";
import { hasValidImageSignature, storedImageKeySchema } from "../src/features/media/validation";
import { buildContentSecurityPolicy } from "../src/features/security/headers";
import { MAX_JSON_BODY_BYTES, readJsonWithLimit } from "../src/features/security/read-json";
import { isTrustedMutationRequest } from "../src/features/security/request-origin";
import { getAuthEnvironment, getDatabaseEnvironment } from "../src/server/env-core";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
});

describe("Phase 5 production environment validation", () => {
  test("production rejects local/insecure auth origins and short secrets", () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.BETTER_AUTH_SECRET = "short";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    assert.throws(getAuthEnvironment, /at least 32/);

    process.env.BETTER_AUTH_SECRET = "a".repeat(32);
    assert.throws(getAuthEnvironment, /https/);

    process.env.BETTER_AUTH_URL = "https://localhost:3000";
    assert.throws(getAuthEnvironment, /localhost/);
  });

  test("remote database requires an allowed protocol and token", () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.TURSO_DATABASE_URL = "ftp://database.example.com/db";
    process.env.TURSO_AUTH_TOKEN = "token";
    assert.throws(getDatabaseEnvironment, /file, libsql, https or wss/);

    process.env.TURSO_DATABASE_URL = "libsql://database.example.com";
    delete process.env.TURSO_AUTH_TOKEN;
    assert.throws(getDatabaseEnvironment, /TURSO_AUTH_TOKEN/);
  });
});

describe("Phase 5 request and response policy", () => {
  test("cross-origin mutations are rejected while trusted and CLI requests remain usable", () => {
    const trusted = "https://portfolio.example.com";
    assert.equal(isTrustedMutationRequest(new Request(`${trusted}/api/admin/profile`, {
      method: "PUT", headers: { origin: trusted },
    }), trusted), true);
    assert.equal(isTrustedMutationRequest(new Request(`${trusted}/api/admin/profile`, {
      method: "PUT", headers: { origin: "https://evil.example" },
    }), trusted), false);
    assert.equal(isTrustedMutationRequest(new Request(`${trusted}/api/admin/profile`, {
      method: "PUT", headers: { "sec-fetch-site": "cross-site" },
    }), trusted), false);
    assert.equal(isTrustedMutationRequest(new Request(`${trusted}/api/admin/profile`, {
      method: "PUT",
    }), trusted), true);
  });

  test("admin JSON bodies are bounded before full buffering", async () => {
    const post = (body: string, headers: Record<string, string> = {}) =>
      new Request("https://portfolio.example.com/api/admin/posts", { method: "POST", body, headers });
    assert.deepEqual(await readJsonWithLimit(post('{"title":"ok"}')), { title: "ok" });
    assert.equal(await readJsonWithLimit(post("not json")), null);
    assert.equal(await readJsonWithLimit(post("{}", { "content-length": String(MAX_JSON_BODY_BYTES + 1) })), null);
    // A maximum-size Tiptap body made of multi-byte Turkish characters still fits.
    assert.notEqual(await readJsonWithLimit(post(JSON.stringify({ text: "ş".repeat(200_000) }))), null);
    assert.equal(await readJsonWithLimit(post(JSON.stringify({ text: "x".repeat(MAX_JSON_BODY_BYTES) }))), null);
  });

  test("production CSP is scoped and excludes unsafe-eval/wildcards", () => {
    const policy = buildContentSecurityPolicy({
      development: false,
      r2PublicBaseUrl: "https://media.example.com/base",
      r2UploadOrigin: "https://bucket.account.r2.cloudflarestorage.com/path-is-ignored",
    });
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /img-src 'self' data: blob: https:\/\/media\.example\.com/);
    assert.match(policy, /connect-src 'self' https:\/\/bucket\.account\.r2\.cloudflarestorage\.com/);
    assert.match(policy, /object-src 'none'/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.match(policy, /upgrade-insecure-requests/);
    assert.doesNotMatch(policy, /unsafe-eval/);
    assert.doesNotMatch(policy, /(?:^|\s)\*(?:\s|;|$)/);
  });
});

describe("Phase 5 upload signature validation", () => {
  test("accepts JPEG, PNG and WebP signatures", () => {
    assert.equal(hasValidImageSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg"), true);
    assert.equal(hasValidImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
    assert.equal(hasValidImageSignature(Uint8Array.from(Buffer.from("RIFF0000WEBP")), "image/webp"), true);
  });

  test("rejects MIME-spoofed or truncated content", () => {
    const html = Uint8Array.from(Buffer.from("<script>alert(1)</script>"));
    assert.equal(hasValidImageSignature(html, "image/jpeg"), false);
    assert.equal(hasValidImageSignature(html, "image/png"), false);
    assert.equal(hasValidImageSignature(Uint8Array.from(Buffer.from("RIFF")), "image/webp"), false);
  });
});

describe("1.9.0 uploaded CV security", () => {
  test("only a real %PDF- header passes; renamed HTML, SVG, images and empty files fail", () => {
    const bytes = (value: string) => Uint8Array.from(Buffer.from(value));
    assert.equal(hasPdfSignature(bytes("%PDF-1.7 binary")), true);
    for (const fake of ["<!doctype html><html>", "<svg xmlns='http://www.w3.org/2000/svg'>", " %PDF-1.7", "%PDF", ""]) {
      assert.equal(hasPdfSignature(bytes(fake)), false, JSON.stringify(fake));
    }
    assert.equal(hasPdfSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), false);
    assert.equal(hasPdfSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00])), false);
  });

  test("CV keys are an isolated cv/<uuid>.pdf namespace, disjoint from image keys", () => {
    const uuid = "123e4567-e89b-42d3-a456-426614174000";
    assert.equal(cvPdfKeySchema.safeParse(`cv/${uuid}.pdf`).success, true);
    for (const key of [`cv/${uuid}.PDF`, `cv/../${uuid}.pdf`, `projects/${uuid}/${uuid}.png`, `cv/${uuid}.pdf/x`, "cv/active.pdf", `/cv/${uuid}.pdf`]) {
      assert.equal(cvPdfKeySchema.safeParse(key).success, false, key);
    }
    assert.equal(storedImageKeySchema.safeParse(`cv/${uuid}.pdf`).success, false);
  });

  test("Content-Disposition filename cannot inject header syntax", () => {
    const crlf = String.fromCharCode(13, 10);
    assert.equal(cvContentDisposition("inline", `x"; filename*=evil${crlf}Set-Cookie: a=b.pdf`), 'inline; filename="xfilenameevilSet-Cookieab.pdf"');
  });

  test("R2 test endpoint is loopback-only and ignored in production", () => {
    assert.equal(parseR2TestEndpoint("http://127.0.0.1:9100", "development"), "http://127.0.0.1:9100");
    assert.equal(parseR2TestEndpoint("http://127.0.0.1:9100", "production"), undefined);
    for (const value of ["https://127.0.0.1:9100", "http://evil.example:9100", "http://127.0.0.1:9100/bucket", "http://u:p@127.0.0.1:9100", "not a url", ""]) {
      assert.equal(parseR2TestEndpoint(value, "development"), undefined, value);
    }
  });
});
