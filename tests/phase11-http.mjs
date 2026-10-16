import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const response = await fetch(base + "/");
assert.equal(response.status, 200);
const body = await response.text();
const main = body.match(/<main id="main-content"[\s\S]*?<\/main>/)?.[0] ?? "";
const checks = [];
function check(name, run) { run(); checks.push(name); console.log(`PASS ${name}`); }
check("narrative progressive enhancement keeps all real server-rendered chapters", () => {
  for (const id of ["hero", "about", "projects", "skills", "journey", "blog", "cv", "contact"]) assert.match(main, new RegExp(`id="${id}"`));
  assert.match(main, /data-spine-lane=/); assert.match(main, /aria-label="Sayfa bölümleri"/);
  assert.match(main, /aria-label="Görünür yetenekler"/); assert.match(main, /Hareketi azalt/);
});
check("chapter navigation only links existing sections; no reference/model dependencies", () => {
  const index = main.match(/<nav class="narrative-index"[\s\S]*?<\/nav>/)?.[0] ?? "";
  for (const match of index.matchAll(/href="#([^"]+)"/g)) assert.ok(main.includes(`id="${match[1]}"`));
  assert.doesNotMatch(main, /utsubo\.com|\.glb|\.gltf|hero-visual/);
});
check("palette accessible name and terminal remain available without debug text", () => {
  assert.match(body, /aria-label="Komut paletini aç"/); assert.match(body, /terminal-trigger/);
  const footer = body.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
  assert.doesNotMatch(footer, /1\.2\.0|terminal-trigger|\/admin/);
});
const cv = await fetch(base + "/cv"); assert.equal(cv.status, 200);
const cvBody = await cv.text();
check("CV stays separate from the narrative scene and preserves privacy", () => {
  assert.doesNotMatch(cvBody, /spine-route|spine-lane|narrative-static-core|narrative-index|Hareketi azalt|phase10-private-cv/);
  assert.match(cvBody, /PDF/);
});
console.log(`Completed ${checks.length} Phase 11 HTTP checks.`);
