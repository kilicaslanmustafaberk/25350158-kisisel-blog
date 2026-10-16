import assert from "node:assert/strict";
import readline from "node:readline";

// Phase 8 production smoke test — read-only and non-destructive.
//
//   PROD_BASE_URL=https://<site> node tests/phase8-production-smoke.mjs
//   vercel env run -e production -- node tests/phase8-production-smoke.mjs   (adds secret-leak scan)
//   node tests/phase8-production-smoke.mjs --admin   (asks for the admin e-mail/password with a hidden prompt)
//
// Secret values are never printed: the leak scan only reports match counts.
// No content is created; the admin path only signs in, reads /admin and signs out.

const baseUrl = (process.env.PROD_BASE_URL ?? "").replace(/\/$/, "");
if (!/^https:\/\//.test(baseUrl)) throw new Error("PROD_BASE_URL must be the https production origin.");
const withAdmin = process.argv.includes("--admin");
const withRateLimit = process.argv.includes("--rate-limit");

const results = [];
async function check(name, run) {
  try {
    const note = await run();
    results.push({ name, ok: true });
    console.log(`PASS ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false });
    console.log(`FAIL ${name} — ${error instanceof Error ? error.message : error}`);
  }
}
const get = (path, init = {}) => fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });

const publicPaths = ["/", "/projects", "/blog", "/cv", "/admin/login"];

await check("public routes return 200", async () => {
  const statuses = [];
  for (const path of publicPaths) statuses.push(`${path}=${(await get(path)).status}`);
  assert.ok(statuses.every((entry) => entry.endsWith("=200")), statuses.join(" "));
  return statuses.join(" ");
});

await check("security headers on every public route", async () => {
  for (const path of publicPaths) {
    const headers = (await get(path)).headers;
    const csp = headers.get("content-security-policy") ?? "";
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'", "connect-src 'self'", "upgrade-insecure-requests"]) {
      assert.ok(csp.includes(directive), `${path} CSP lacks ${directive}`);
    }
    assert.ok(!csp.includes("unsafe-eval"), `${path} CSP has unsafe-eval`);
    assert.ok(!/(^|\s)\*(\s|;|$)/.test(csp), `${path} CSP has wildcard source`);
    assert.equal(headers.get("strict-transport-security"), "max-age=31536000", `${path} HSTS`);
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("x-frame-options"), "DENY");
    assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=()");
    assert.equal(headers.get("x-powered-by"), null);
  }
});

await check("admin/auth are private and anonymous admin is redirected", async () => {
  assert.match((await get("/admin/login")).headers.get("cache-control") ?? "", /no-store/);
  const admin = await get("/admin");
  assert.ok([302, 303, 307].includes(admin.status), `status ${admin.status}`);
  assert.match(admin.headers.get("location") ?? "", /\/admin\/login/);
});

await check("anonymous mutations are 401 and signup is disabled", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const [path, method] of [["/api/admin/projects", "POST"], ["/api/admin/posts", "POST"], ["/api/admin/profile", "PUT"], ["/api/admin/social-links", "POST"], [`/api/admin/projects/${id}/uploads/presign`, "POST"]]) {
    const response = await get(path, { method, headers: { Origin: baseUrl, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(response.status, 401, `${method} ${path}`);
  }
  const signup = await get("/api/auth/sign-up/email", { method: "POST", headers: { Origin: baseUrl, "Content-Type": "application/json" }, body: JSON.stringify({ name: "No", email: "phase8-signup-probe@example.invalid", password: "NotAllowedPassword123!" }) });
  assert.equal(signup.status, 400);
});

await check("404 pages render a single header", async () => {
  const notes = [];
  for (const path of ["/phase8-bu-sayfa-yok", "/projects/phase8-olmayan-proje", "/blog/phase8-olmayan-yazi"]) {
    const response = await get(path);
    const html = await response.text();
    assert.equal(response.status, 404, path);
    const headers = (html.match(/class="site-header"/g) ?? []).length;
    assert.ok(headers <= 1, `${path} renders ${headers} headers`);
    notes.push(`${path}:404/header=${headers}`);
  }
  return notes.join(" ");
});

await check("CV PDF endpoint", async () => {
  const response = await get("/api/cv/pdf");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  if (response.status === 404) {
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    return "404 (no public CV profile yet) — expected generic JSON";
  }
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition") ?? "", /^inline; filename="[a-z0-9-]+\.pdf"$/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.ok(bytes.length > 1000, "PDF too small");
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
  return `200 application/pdf ${bytes.length} bytes`;
});

await check("landing GitHub section is server-rendered or absent without client API calls", async () => {
  const html = await (await get("/")).text();
  const section = html.includes('id="github"');
  assert.ok(!html.includes("api.github.com"), "api.github.com referenced in HTML");
  return section ? (html.includes("Public repository</dt>") ? "section with API data" : "section in link-only fallback") : "no GitHub username configured";
});

// Collect client assets referenced from public HTML for the leak scan.
const assetUrls = new Set();
const documents = [];
for (const path of publicPaths) {
  const html = await (await get(path)).text();
  documents.push(html);
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)) assetUrls.add(match[1]);
}
const assets = [...documents];
for (const url of assetUrls) assets.push(await (await get(url)).text());

await check("no server secret or server-only identifier in HTML/client assets", async () => {
  const names = ["TURSO_AUTH_TOKEN", "BETTER_AUTH_SECRET", "R2_SECRET_ACCESS_KEY", "R2_ACCESS_KEY_ID", "GITHUB_TOKEN", "TURSO_DATABASE_URL"];
  const valueNames = ["TURSO_AUTH_TOKEN", "BETTER_AUTH_SECRET", "R2_SECRET_ACCESS_KEY", "R2_ACCESS_KEY_ID", "GITHUB_TOKEN", "TURSO_DATABASE_URL", "R2_ACCOUNT_ID"];
  const counts = {};
  for (const name of names) counts[`name:${name}`] = assets.filter((text) => text.includes(name)).length;
  let scannedValues = 0;
  for (const name of valueNames) {
    const value = process.env[name]?.trim();
    if (!value || value.length < 8) continue;
    scannedValues += 1;
    counts[`value:${name}`] = assets.filter((text) => text.includes(value)).length;
  }
  counts["pattern:libsql://"] = assets.filter((text) => text.includes("libsql://")).length;
  const leaks = Object.entries(counts).filter(([, count]) => count > 0);
  assert.equal(leaks.length, 0, `matches: ${leaks.map(([key, count]) => `${key}=${count}`).join(", ")}`);
  return `${assets.length} documents/assets scanned, ${scannedValues} secret values compared, 0 matches`;
});

async function prompt(question, hidden) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (text) => { if (text.includes(question)) process.stdout.write(text); };
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  if (hidden) process.stdout.write("\n");
  return answer.trim();
}

if (withAdmin) {
  const email = await prompt("Admin e-posta: ", false);
  const password = await prompt("Admin parola (gizli): ", true);
  const login = await get("/api/auth/sign-in/email", { method: "POST", headers: { Origin: baseUrl, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const setCookies = login.headers.getSetCookie();
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ");

  await check("admin sign-in over HTTPS", async () => {
    assert.equal(login.status, 200, `status ${login.status}`);
  });

  await check("session cookie attributes on the real HTTPS response", async () => {
    const session = setCookies.find((value) => /session_token=/.test(value));
    assert.ok(session, "no session_token cookie");
    const attributes = session.split(";").slice(1).map((part) => part.trim());
    const name = session.split("=", 1)[0];
    assert.ok(attributes.some((a) => /^secure$/i.test(a)), "Secure missing");
    assert.ok(attributes.some((a) => /^httponly$/i.test(a)), "HttpOnly missing");
    assert.ok(attributes.some((a) => /^samesite=lax$/i.test(a)), "SameSite=Lax missing");
    assert.ok(attributes.some((a) => /^path=\/$/i.test(a)), "Path=/ missing");
    assert.ok(attributes.some((a) => /^(max-age|expires)=/i.test(a)), "expiry missing");
    // Only the cookie name and attribute names are reported — never the value.
    return `${name}; ${attributes.map((a) => a.split("=")[0]).join("; ")}; ${attributes.find((a) => /^max-age/i.test(a)) ?? ""}`;
  });

  await check("authenticated /admin is reachable", async () => {
    const response = await get("/admin", { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
  });

  await check("authenticated cross-origin mutation is still rejected", async () => {
    const response = await get("/api/admin/profile", { method: "PUT", headers: { Cookie: cookie, Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" }, body: "{}" });
    assert.equal(response.status, 401);
  });

  await check("sign-out invalidates the session", async () => {
    const out = await get("/api/auth/sign-out", { method: "POST", headers: { Cookie: cookie, Origin: baseUrl, "Content-Type": "application/json" }, body: "{}" });
    assert.equal(out.status, 200);
    const after = await get("/admin", { headers: { Cookie: cookie } });
    assert.ok([302, 303, 307].includes(after.status), `status ${after.status}`);
  });
}

if (withRateLimit) {
  // Uses a non-existent account so the real admin account is never targeted.
  await check("wrong credentials are generic and sign-in is rate limited", async () => {
    const statuses = [];
    let body = "";
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await get("/api/auth/sign-in/email", { method: "POST", headers: { Origin: baseUrl, "Content-Type": "application/json" }, body: JSON.stringify({ email: "phase8-ratelimit-probe@example.invalid", password: "WrongPassword123!" }) });
      statuses.push(response.status);
      if (attempt === 0) body = await response.text();
    }
    assert.equal(statuses[0], 401);
    assert.doesNotMatch(body, /not found|no user|does not exist/i);
    assert.ok(statuses.includes(429), statuses.join(","));
    return statuses.join(",");
  });
}

const failed = results.filter((result) => !result.ok).length;
console.log(`Completed ${results.length} production smoke checks, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
