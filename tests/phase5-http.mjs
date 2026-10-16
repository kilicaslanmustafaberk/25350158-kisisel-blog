import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;

const checks = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log(`PASS ${name}`);
}

async function request(path, options = {}, cookie = "") {
  return fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      Origin: baseUrl,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
  });
}

await check("CSP and security headers on public/admin pages", async () => {
  for (const path of ["/", "/projects", "/blog", "/cv", "/admin/login"]) {
    const response = await request(path);
    assert.equal(response.status, 200, `${path} did not return 200`);
    const csp = response.headers.get("content-security-policy") ?? "";
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'"]) {
      assert.ok(csp.includes(directive), `${path} lacks ${directive}`);
    }
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("x-powered-by"), null);
  }
});

await check("admin/auth responses are not publicly cacheable", async () => {
  const privateCachePolicy = /no-store|no-cache/;
  assert.match((await request("/admin/login")).headers.get("cache-control") ?? "", privateCachePolicy);
  const unauthorized = await request("/api/admin/profile", { method: "PUT", body: "{}" });
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get("cache-control") ?? "", privateCachePolicy);
});

await check("representative admin mutation classes reject anonymous requests", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const [path, method, body] of [
    ["/api/admin/projects", "POST", {}],
    ["/api/admin/posts", "POST", {}],
    ["/api/admin/profile", "PUT", {}],
    ["/api/admin/education", "POST", {}],
    ["/api/admin/experience", "POST", {}],
    ["/api/admin/skills", "POST", {}],
    ["/api/admin/cv/settings", "PUT", {}],
    [`/api/admin/projects/${id}/uploads/presign`, "POST", {}],
    [`/api/admin/projects/${id}/uploads/finalize`, "POST", {}],
  ]) {
    const response = await request(path, { method, body: JSON.stringify(body) });
    assert.equal(response.status, 401, `${method} ${path}`);
  }
});

await check("public signup remains disabled", async () => {
  const response = await request("/api/auth/sign-up/email", {
    method: "POST",
    body: JSON.stringify({ name: "Not Allowed", email: "signup-phase5@example.com", password: "NotAllowedPassword123!" }),
  });
  assert.equal(response.status, 400);
});

if (email && password) {
  const login = await request("/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.getSetCookie().join("; ");
  const cookie = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");

  await check("local session cookie exposes the expected non-HTTPS attributes", async () => {
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.match(setCookie, /Path=\//i);
    assert.match(setCookie, /Max-Age=|Expires=/i);
  });

  await check("authenticated cross-origin mutation is rejected", async () => {
    const response = await request("/api/admin/profile", {
      method: "PUT",
      body: "{}",
      headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" },
    }, cookie);
    assert.equal(response.status, 401);
  });

  await check("anonymous admin page HTML/RSC responses never contain draft data", async () => {
    const title = `Phase19 Draft Canary ${Date.now()}`;
    const created = await request("/api/admin/posts", {
      method: "POST",
      body: JSON.stringify({
        title,
        slug: `phase19-draft-canary-${Date.now()}`,
        excerpt: "Anonim admin sayfası sızıntı testi için yeterince uzun özet.",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "canary" }] }] },
        categoryId: "",
        tagIds: [],
        newTagNames: [],
        status: "draft",
        publishedAt: "",
        seoTitle: "",
        seoDescription: "",
      }),
    }, cookie);
    assert.equal(created.status, 201);
    const { id } = await created.json();
    try {
      for (const path of ["/admin/blog", `/admin/blog/${id}/edit`]) {
        for (const headers of [{}, { RSC: "1" }]) {
          let response = await request(path, { headers });
          const location = response.headers.get("location") ?? "";
          if (headers.RSC && location.includes("_rsc")) response = await request(location, { headers });
          assert.ok(!(await response.text()).includes(title), `${path} leaked draft data (RSC=${Boolean(headers.RSC)})`);
        }
      }
    } finally {
      await request(`/api/admin/posts/${id}`, { method: "DELETE" }, cookie);
    }
  });
}

await check("PDF error response is JSON, generic and no-store when no public CV exists", async () => {
  const response = await request("/api/cv/pdf");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.doesNotMatch(await response.text(), /TURSO|libsql|stack|node_modules/i);
});

console.log(`Completed ${checks.length} Phase 5 HTTP security checks.`);
