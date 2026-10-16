import assert from "node:assert/strict";

// Phase 15 polish: server-rendered contract for the active core, item-level
// branches, hero microcopy, chapter indicator and the secondary spine motif.
// Motion itself (core travel, arrival, hover) is verified in the browser.
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const body = await (await fetch(base + "/")).text();
const main = body.match(/<main id="main-content"[\s\S]*?<\/main>/)?.[0] ?? "";
const checks = [];
function check(name, run) { run(); checks.push(name); console.log(`PASS ${name}`); }

check("landing renders exactly one active white core inside the decorative route layer", () => {
  const layer = main.match(/<div class="spine-route" aria-hidden="true">[\s\S]*?<\/svg><\/div>/)?.[0] ?? "";
  assert.equal(layer.match(/class="spine-core"/g)?.length ?? 0, 1);
  assert.equal(main.match(/class="spine-core"/g)?.length ?? 0, 1);
});
check("hero microcopy removed; continue link is a real in-page link with decorative arrow", () => {
  assert.doesNotMatch(main, /Veri omurgası\. Mühendislik izi\./);
  assert.match(main, /<a class="hero-continue" href="#[a-z]+">/);
  assert.match(main, /class="hero-continue-arrow" aria-hidden="true"/);
});
check("timeline: every entry has its own item-level branch anchor", () => {
  const journey = main.match(/<section[^>]*id="journey"[\s\S]*?<\/section>/)?.[0];
  if (!journey) return;
  const items = journey.match(/<li data-spine-item/g)?.length ?? 0;
  assert.equal(journey.match(/data-spine-anchor="tick"/g)?.length ?? 0, items);
});
check("GitHub repo rows hang off the route individually when the profile is available", () => {
  const github = main.match(/<section[^>]*id="github"[\s\S]*?<\/section>/)?.[0];
  if (!github || !/class="github-repos"/.test(github)) return;
  const rows = github.match(/<li data-spine-item=""><span class="spine-anchor spine-anchor--tick"/g)?.length ?? 0;
  assert.equal(rows, github.match(/<li data-spine-item/g)?.length ?? 0);
});
check("chapter indicator has a decorative progress track and stays a labelled nav", () => {
  const nav = main.match(/<nav class="narrative-index"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(nav, /aria-label="Sayfa bölümleri"/);
  assert.match(nav, /<span class="narrative-index-track" aria-hidden="true">/);
});
check("landing does not carry the standalone secondary motif", () => assert.doesNotMatch(main, /secondary-spine/));
for (const [path, variant] of [["/projects", "projects"], ["/blog", "blog"], ["/cv", "cv"]]) {
  const page = await (await fetch(base + path)).text();
  check(`${path} carries the secondary spine motif (${variant}), decorative and without the landing spine`, () => {
    assert.match(page, new RegExp(`<main id="main-content" class="has-secondary-spine"><div class="secondary-spine" data-variant="${variant}" aria-hidden="true">`));
    assert.doesNotMatch(page, /data-spine-lane|spine-canvas|spine-core|class="spine-route"/);
  });
}
console.log(`Completed ${checks.length} Phase 15 HTTP checks.`);
