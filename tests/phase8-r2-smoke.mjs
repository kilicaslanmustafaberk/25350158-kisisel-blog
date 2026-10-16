import assert from "node:assert/strict";

import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Phase 8 real R2 smoke test. Mirrors src/server/storage/r2.ts (S3 API endpoint,
// 300 s presigned PUT, exact key, signed Content-Type) but writes NO database rows:
//
//   vercel env run -e production -- node tests/phase8-r2-smoke.mjs
//
// The object lives under projects/smoke-tests/<uuid>.webp (so the production
// next/image remote pattern can be exercised) and is always deleted at the end.
// Credential values are never printed.

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required (inject it with vercel env run).`);
  return value;
};
const accountId = required("R2_ACCOUNT_ID");
const bucket = required("R2_BUCKET_NAME");
const publicBase = required("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
const siteOrigin = (process.env.PROD_BASE_URL ?? required("BETTER_AUTH_URL")).replace(/\/$/, "");
const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: required("R2_ACCESS_KEY_ID"), secretAccessKey: required("R2_SECRET_ACCESS_KEY") },
});

// Valid 1×1 lossless WebP (26 bytes).
const webp = Buffer.from("UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==", "base64");
const key = `projects/smoke-tests/${crypto.randomUUID()}.webp`;
const results = [];
async function check(name, run) {
  try {
    const note = await run();
    results.push(true);
    console.log(`PASS ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    results.push(false);
    console.log(`FAIL ${name} — ${error instanceof Error ? `${error.name}: ${error.message}` : error}`);
  }
}

let signedUrl = "";
await check("presigned PUT URL uses the S3 API host and short expiry", async () => {
  signedUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: "image/webp" }), { expiresIn: 300 });
  const url = new URL(signedUrl);
  assert.equal(url.hostname, `${bucket}.${accountId}.r2.cloudflarestorage.com`);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.match(url.searchParams.get("X-Amz-SignedHeaders") ?? "", /content-type/);
  return "host=<bucket>.<account>.r2.cloudflarestorage.com, X-Amz-Expires=300, content-type signed";
});

await check("CORS preflight allows the production origin only", async () => {
  const preflight = (origin) => fetch(signedUrl, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
  const allowed = await preflight(siteOrigin);
  assert.equal(allowed.headers.get("access-control-allow-origin"), siteOrigin, `allowed origin status ${allowed.status}`);
  assert.match(allowed.headers.get("access-control-allow-methods") ?? "", /PUT/);
  const evil = await preflight("https://evil.example");
  assert.notEqual(evil.headers.get("access-control-allow-origin"), "https://evil.example");
  assert.notEqual(evil.headers.get("access-control-allow-origin"), "*");
  return `site origin allowed (${allowed.status}), foreign origin not allowed (${evil.status})`;
});

await check("signed Content-Type is enforced", async () => {
  const wrong = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": "text/html", Origin: siteOrigin }, body: "<script>alert(1)</script>" });
  assert.ok(wrong.status === 403 || wrong.status === 400, `status ${wrong.status}`);
  return `mismatched Content-Type rejected with ${wrong.status}`;
});

await check("browser-style PUT upload", async () => {
  const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": "image/webp", Origin: siteOrigin }, body: webp });
  assert.equal(put.status, 200);
});

await check("HEAD verification (size + Content-Type)", async () => {
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  assert.equal(head.ContentLength, webp.length);
  assert.equal(head.ContentType, "image/webp");
  return `${head.ContentLength} bytes image/webp`;
});

await check("magic-byte verification via Range GET", async () => {
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-15" }));
  const bytes = Buffer.from(await object.Body.transformToByteArray());
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
});

await check("public delivery URL", async () => {
  const response = await fetch(`${publicBase}/${key}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  return `${new URL(publicBase).hostname} 200 image/webp`;
});

await check("production next/image accepts the R2 remote pattern", async () => {
  const response = await fetch(`${siteOrigin}/_next/image?url=${encodeURIComponent(`${publicBase}/${key}`)}&w=64&q=75`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^image\//);
  return `200 ${response.headers.get("content-type")}`;
});

await check("cleanup deletes the smoke object", async () => {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    throw new Error("object still exists");
  } catch (error) {
    if (error instanceof Error && error.message === "object still exists") throw error;
    assert.equal(error?.$metadata?.httpStatusCode, 404);
  }
  return "HEAD after delete = 404";
});

const failed = results.filter((ok) => !ok).length;
console.log(`Completed ${results.length} R2 smoke checks, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
