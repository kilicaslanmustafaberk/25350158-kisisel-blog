import assert from "node:assert/strict";

// Phase 13 Data Spine: server-rendered contract only. Canvas/WebGL behaviour is
// verified in the browser; here we prove content, fallback, footer and privacy.
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const response = await fetch(base + "/");
assert.equal(response.status, 200);
const body = await response.text();
const main = body.match(/<main id="main-content"[\s\S]*?<\/main>/)?.[0] ?? "";
const checks = [];
function check(name, run) { run(); checks.push(name); console.log(`PASS ${name}`); }

check("Data Spine replaces the sphere: SSR lanes/hubs are the no-JS fallback, old sphere markup is gone", () => {
  assert.match(main, /class="spine-lane"/);
  assert.doesNotMatch(main, /spine-fallback/, "Phase 14 removed the section-local CSS spine silhouette");
  assert.match(main, /class="landing-background"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(body, /narrative-static-core|narrative-scene|hero-visual|hero-static-network/);
  assert.doesNotMatch(main, /\.glb|\.gltf/);
});
check("Projects cards stay real HTML links and carry decorative spine anchors", () => {
  const projects = main.match(/<section[^>]*id="projects"[\s\S]*?<\/section>/)?.[0] ?? "";
  const cards = projects.match(/class="project-card"/g)?.length ?? 0;
  const anchoredCards = projects.match(/class="project-card"[^>]*><span class="spine-anchor"/g)?.length ?? 0;
  assert.equal(anchoredCards, cards, "every featured card hangs off the spine");
  assert.ok((projects.match(/data-spine-anchor/g)?.length ?? 0) >= 1, "Projects always has at least one branch target (cards or empty state)");
  for (const anchor of projects.match(/<span class="spine-anchor"[^>]*>/g) ?? []) assert.match(anchor, /aria-hidden="true"/);
  if (cards) assert.match(projects, /<a [^>]*href="\/projects\/[^"]+"/);
});
check("Contact keeps real links and the polished copy", () => {
  const contact = main.match(/<section[^>]*id="contact"[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.match(contact, /Yeni bir fikir üzerine konuşalım\./);
  assert.match(contact, /Bir proje, iş (birliği|fırsatı) ya da teknik bir konu için/);
  assert.match(contact, /<ul class="contact-links"/);
  assert.match(contact, /<a [^>]*href="(mailto:|tel:|https:|\/cv)/);
  assert.doesNotMatch(contact, /<canvas|spine-scene|spine-fallback|spine-canvas/);
});
check("footer is a quiet closing line: no nav, social, CV, admin or version links", () => {
  const footer = body.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.match(footer, /site-footer-closing/);
  assert.match(footer, /©/);
  assert.doesNotMatch(footer, /<a |<nav|\/admin|1\.[0-9]\.[0-9]|github\.com|instagram|linkedin/i);
});
for (const path of ["/projects", "/cv"]) {
  const page = await (await fetch(base + path)).text();
  check(`${path} uses the same simple footer and no landing scene`, () => {
    const footer = page.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
    assert.match(footer, /site-footer-closing/); assert.doesNotMatch(footer, /<a |<nav/);
    assert.doesNotMatch(page, /spine-fallback|spine-scene|spine-lane|spine-route/);
  });
}
console.log(`Completed ${checks.length} Phase 13 HTTP checks.`);
