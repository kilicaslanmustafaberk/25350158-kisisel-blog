import assert from "node:assert/strict";
import test from "node:test";

import { buildCommandIndex, filterCommands, type PublicCommandData } from "../src/features/command-palette/commands";
import {
  repositoryKey,
  resolveGitHubUsername,
  selectPublicRepositories,
  toGitHubProfileDTO,
  usernameFromGitHubUrl,
} from "../src/features/github/profile";
import { contentPath, isSafeInternalPath, toSafeDestination } from "../src/features/navigation/safe-href";
import { buildCaseSections, formatProjectDate, parseTechnicalText, projectStatusLabel } from "../src/features/projects/case-study";
import { runTerminalCommand, terminalCommands } from "../src/features/terminal/registry";

const data: PublicCommandData = {
  name: "Test Kişi",
  headline: "Yazılım geliştirici",
  summary: "Kısa özet",
  email: null,
  cvAvailable: true,
  projects: [
    { title: "Portfolyo Platformu", slug: "portfolyo-platformu", shortDescription: "Kişisel site" },
    { title: "Kötü slug", slug: "../admin", shortDescription: "Geçersiz" },
  ],
  posts: [{ title: "Next.js notları", slug: "nextjs-notlari" }],
  skills: [{ name: "TypeScript", category: "Dil" }, { name: "SQLite", category: "Veri" }, { name: "Go", category: "Dil" }],
  links: [
    { label: "LinkedIn", platform: "linkedin", url: "https://www.linkedin.com/in/test" },
    { label: "Zararlı", platform: "other", url: "javascript:alert(1)" },
    { label: "HTTP", platform: "other", url: "http://example.com" },
  ],
  githubUrl: "https://github.com/octocat",
};

// ---------- navigation allowlist ----------

test("safe href allowlist accepts internal paths and https only", () => {
  assert.ok(isSafeInternalPath("/projects/foo"));
  assert.ok(isSafeInternalPath("/#contact"));
  assert.ok(!isSafeInternalPath("//evil.example"));
  assert.ok(!isSafeInternalPath("/projects/../admin"));
  assert.ok(!isSafeInternalPath("javascript:alert(1)"));
  assert.ok(!isSafeInternalPath("/\\evil.example"));
  assert.equal(toSafeDestination("javascript:alert(1)", true), null);
  assert.equal(toSafeDestination("data:text/html,x", true), null);
  assert.equal(toSafeDestination("http://example.com", true), null);
  assert.equal(toSafeDestination("https://user:pw@example.com", true), null);
  assert.deepEqual(toSafeDestination("https://github.com/octocat", true), { href: "https://github.com/octocat", external: true });
  assert.equal(contentPath("/projects", "../admin"), null);
  assert.equal(contentPath("/blog", "ok-slug"), "/blog/ok-slug");
});

// ---------- command palette ----------

test("command index uses real public data and drops unsafe destinations", () => {
  const index = buildCommandIndex(data);
  const ids = index.map((item) => item.id);
  assert.ok(ids.includes("page-home") && ids.includes("page-cv") && ids.includes("page-blog"));
  assert.ok(ids.includes("project-portfolyo-platformu"));
  assert.ok(!ids.some((id) => id.includes("admin")), "no admin command or path-traversal slug");
  assert.ok(ids.includes("link-cv-pdf") && ids.includes("link-github") && ids.includes("tool-terminal"));
  for (const item of index) {
    if (item.action) continue;
    assert.ok(item.href && (item.external ? item.href.startsWith("https://") : item.href.startsWith("/")), `${item.id} has unsafe href`);
  }
  assert.ok(!index.some((item) => item.label === "Zararlı" || item.label === "HTTP"));
});

test("command index hides CV PDF and GitHub when unavailable", () => {
  const ids = buildCommandIndex({ ...data, cvAvailable: false, githubUrl: null, projects: [], posts: [] }).map((item) => item.id);
  assert.ok(!ids.includes("link-cv-pdf"));
  assert.ok(!ids.includes("link-github"));
  assert.ok(!ids.some((id) => id.startsWith("project-")));
});

test("command filtering matches label, keyword and group, Turkish-insensitive", () => {
  const index = buildCommandIndex(data);
  assert.equal(filterCommands(index, "")[0].id, "page-home");
  assert.equal(filterCommands(index, "portfolyo")[0].id, "project-portfolyo-platformu");
  assert.ok(filterCommands(index, "resume").some((item) => item.id === "page-cv"), "keyword match");
  assert.ok(filterCommands(index, "PROJELER").some((item) => item.id === "project-portfolyo-platformu"), "group match");
  assert.ok(filterCommands(index, "ozgecmis").some((item) => item.id === "page-cv"), "diacritics-insensitive");
  assert.ok(filterCommands(index, "iletisim").some((item) => item.id === "page-contact"), "dotless i normalized");
  assert.deepEqual(filterCommands(index, "zzzz-nothing"), []);
});

// ---------- terminal ----------

test("terminal registry is deterministic and never evaluates input", () => {
  const help = runTerminalCommand("help", data);
  assert.equal(help.kind, "output");
  if (help.kind === "output") assert.equal(help.lines.length, Object.keys(terminalCommands).length);
  assert.deepEqual(runTerminalCommand("  HELP ", data), help);
  assert.deepEqual(runTerminalCommand("clear", data), { kind: "clear" });
  for (const hostile of ["constructor", "__proto__", "toString", "alert(1)", "rm -rf /", "eval('1')", "projects; cv"]) {
    const result = runTerminalCommand(hostile, data);
    assert.equal(result.kind, "output");
    if (result.kind === "output") {
      assert.equal(result.lines.length, 1, hostile);
      assert.equal(result.lines[0].tone, "error", hostile);
      assert.equal(result.lines[0].href, undefined, hostile);
    }
  }
});

test("terminal data commands return real public data with allowlisted links", () => {
  const projects = runTerminalCommand("projects", data);
  assert.ok(projects.kind === "output");
  if (projects.kind !== "output") return;
  assert.equal(projects.lines[0].href, "/projects/portfolyo-platformu");
  assert.ok(!projects.lines.some((line) => line.text === "Kötü slug"));
  const skills = runTerminalCommand("skills", data);
  assert.ok(skills.kind === "output" && skills.lines.some((line) => line.text === "Dil: TypeScript, Go"));
  const contact = runTerminalCommand("contact", data);
  assert.ok(contact.kind === "output");
  if (contact.kind === "output") {
    assert.ok(contact.lines.every((line) => !line.href || line.href.startsWith("https://")));
    assert.ok(!contact.lines.some((line) => line.href?.startsWith("javascript")));
  }
  const github = runTerminalCommand("github", { ...data, githubUrl: null });
  assert.ok(github.kind === "output" && github.lines[0].href === undefined);
});

// ---------- GitHub ----------

const repo = (overrides: Record<string, unknown>) => ({
  name: "repo", html_url: "https://github.com/octocat/repo", description: null, fork: false, archived: false,
  private: false, visibility: "public", language: "TypeScript", stargazers_count: 2, pushed_at: "2026-09-01T00:00:00Z",
  owner: { login: "octocat" }, node_id: "x", ...overrides,
});

test("GitHub username is derived from social link first, env second, and validated", () => {
  assert.equal(usernameFromGitHubUrl("https://github.com/octocat"), "octocat");
  assert.equal(usernameFromGitHubUrl("https://github.com/octocat/repo"), null);
  assert.equal(usernameFromGitHubUrl("http://github.com/octocat"), null);
  assert.equal(usernameFromGitHubUrl("https://gitlab.com/octocat"), null);
  assert.equal(resolveGitHubUsername([{ platform: "GitHub", url: "https://github.com/from-link" }], "from-env"), "from-link");
  assert.equal(resolveGitHubUsername([], "from-env"), "from-env");
  assert.equal(resolveGitHubUsername([], "bad/../name"), null);
  assert.equal(resolveGitHubUsername([], undefined), null);
});

test("repository selection drops forks, archived, non-public and CMS-private repos", () => {
  const raw = [
    repo({ name: "a", html_url: "https://github.com/octocat/a" }),
    repo({ name: "fork", html_url: "https://github.com/octocat/fork", fork: true }),
    repo({ name: "old", html_url: "https://github.com/octocat/old", archived: true }),
    repo({ name: "secret", html_url: "https://github.com/octocat/secret", private: true, visibility: "private" }),
    repo({ name: "cms-private", html_url: "https://github.com/octocat/cms-private" }),
    repo({ name: "evil", html_url: "javascript:alert(1)" }),
    { name: "malformed" },
    repo({ name: "b", html_url: "https://github.com/octocat/b" }),
  ];
  const selected = selectPublicRepositories(raw, { excludeKeys: new Set([repositoryKey("https://github.com/Octocat/CMS-Private.git")!]) });
  assert.deepEqual(selected.map((item) => item.name), ["a", "b"]);
  assert.deepEqual(Object.keys(selected[0]).sort(), ["description", "language", "name", "pushedAt", "stars", "url"]);
  assert.equal(selectPublicRepositories(Array.from({ length: 20 }, (_, index) => repo({ name: `r${index}` })), { limit: 6 }).length, 6);
});

test("GitHub profile DTO is narrow and rejects invalid shapes", () => {
  const user = { login: "octocat", name: "The Octocat", html_url: "https://github.com/octocat", public_repos: 8, followers: 9999, email: "x@example.com", type: "User" };
  const dto = toGitHubProfileDTO(user, [repo({})]);
  assert.ok(dto);
  assert.deepEqual(Object.keys(dto!).sort(), ["name", "profileUrl", "publicRepoCount", "repositories", "username"]);
  assert.equal(toGitHubProfileDTO({ ...user, html_url: "https://evil.example/octocat" }, []), null);
  assert.equal(toGitHubProfileDTO({ ...user, public_repos: "8" }, []), null);
  assert.equal(toGitHubProfileDTO(user, { message: "API rate limit exceeded" }), null);
});

// ---------- project case study ----------

test("case section navigation lists only sections that exist", () => {
  assert.deepEqual(buildCaseSections({ detailedDescription: "x", problem: "  ", solution: null, architectureDescription: "arch", galleryCount: 0, hasLinks: true }).map((item) => item.id), ["overview", "architecture", "links"]);
  assert.deepEqual(buildCaseSections({ detailedDescription: null, problem: null, solution: null, architectureDescription: null, galleryCount: 0, hasLinks: false }), []);
});

test("technical text is split into paragraphs and lists without inventing content", () => {
  const blocks = parseTechnicalText("Sunucu öncelikli yapı.\r\n\r\n- Next.js App Router\n- Turso\nSon not.\n\n1. Adım bir\n2) Adım iki");
  assert.deepEqual(blocks, [
    { type: "paragraph", text: "Sunucu öncelikli yapı." },
    { type: "list", items: ["Next.js App Router", "Turso"] },
    { type: "paragraph", text: "Son not." },
    { type: "list", items: ["Adım bir", "Adım iki"] },
  ]);
  assert.deepEqual(parseTechnicalText("<script>alert(1)</script>"), [{ type: "paragraph", text: "<script>alert(1)</script>" }]);
  assert.equal(projectStatusLabel("in_progress"), "Devam ediyor");
  assert.equal(formatProjectDate("2026-04-12"), "12 Nisan 2026");
  assert.equal(formatProjectDate("not-a-date"), "not-a-date");
});
