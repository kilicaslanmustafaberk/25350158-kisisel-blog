import assert from "node:assert/strict";

// Phase 14 continuous Data Spine: server-rendered contract. The route itself is
// measured and drawn client-side (verified in the browser); here we prove that
// every landing section declares one lane + hub on the SAME spine, content
// anchors hang off it, decorative layers stay aria-hidden, and other pages are clean.
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const response = await fetch(base + "/");
assert.equal(response.status, 200);
const body = await response.text();
const main = body.match(/<main id="main-content"[\s\S]*?<\/main>/)?.[0] ?? "";
const checks = [];
function check(name, run) { run(); checks.push(name); console.log(`PASS ${name}`); }

const sections = [...main.matchAll(/<section[^>]*id="([^"]+)"[\s\S]*?<\/section>/g)];
check("every landing section is a lane of one spine: exactly one lane + hub each", () => {
  assert.ok(sections.length >= 4);
  for (const [html, id] of sections) {
    assert.match(html, /data-spine-section/, `${id} joins the spine`);
    assert.equal(html.match(/data-spine-lane=/g)?.length ?? 0, 1, `${id} has one lane`);
    assert.equal(html.match(/class="spine-hub"/g)?.length ?? 0, 1, `${id} has one hub`);
  }
  const ids = [...main.matchAll(/data-spine-lane="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "lane ids are unique");
  assert.equal(ids[0], "hero"); assert.equal(ids.at(-1), "contact");
});
check("one route layer + one canvas host for the whole page, decorative and hidden from AT", () => {
  assert.equal(main.match(/class="spine-route"/g)?.length ?? 0, 1);
  assert.equal(main.match(/class="spine-canvas"/g)?.length ?? 0, 1);
  assert.match(main, /class="spine-route" aria-hidden="true"/);
  assert.match(main, /class="spine-canvas" aria-hidden="true"/);
  for (const lane of main.match(/<div class="spine-lane"[^>]*>/g) ?? []) assert.match(lane, /aria-hidden="true"/);
  for (const anchor of main.match(/<span class="spine-anchor"[^>]*>/g) ?? []) assert.match(anchor, /aria-hidden="true"/);
  assert.doesNotMatch(main, /spine-fallback|data-connector|spine-connectors/, "Phase 13 section-local connectors/silhouette are gone");
});
check("blog, CV, GitHub and contact hang off the spine (anchors), including empty states", () => {
  for (const [html, id] of sections) if (["blog", "cv", "github", "contact", "journey"].includes(id)) assert.match(html, /data-spine-anchor/, `${id} anchored`);
});
check("timeline lane is the calm trace; chapter cues follow the rendered sections", () => {
  const journey = sections.find(([, id]) => id === "journey")?.[0];
  if (journey) assert.match(journey, /data-spine-lane="journey" data-spine-calm="true"/);
  const cues = [...main.matchAll(/class="chapter-cue"[^>]*>(\d\d) \/\/ /g)].map(match => Number(match[1]));
  assert.deepEqual(cues, cues.map((_, i) => i + 1), "cue numbers are sequential");
});
check("contact links remain real, above decoration, and the footer stays a closing line", () => {
  const contact = sections.find(([, id]) => id === "contact")?.[0] ?? "";
  assert.match(contact, /<ul class="contact-links"/);
  assert.match(contact, /<a [^>]*href="(mailto:|tel:|https:|\/cv)/);
  const footer = body.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.doesNotMatch(footer, /<a |<nav|spine-/);
});
for (const path of ["/projects", "/blog", "/cv"]) {
  const page = await (await fetch(base + path)).text();
  check(`${path} carries no landing spine markup`, () => assert.doesNotMatch(page, /data-spine-lane|spine-route|spine-canvas|spine-anchor/));
}
console.log(`Completed ${checks.length} Phase 14 HTTP checks.`);
