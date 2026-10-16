import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const response = await fetch(base + "/");
assert.equal(response.status, 200);
const body = await response.text();
let count = 0;
for (const id of ["projects", "journey", "blog", "cv", "github", "contact"]) {
  const section = body.match(new RegExp(`<section[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];
  if (!section) {
    assert.ok(["journey", "cv", "github"].includes(id), `${id} is required`);
    continue;
  }
  assert.match(section, /data-spine-sequence=""/);
  const items = section.match(/<(?:article|li|div|p)[^>]*data-spine-item=""[^>]*>/g) ?? [];
  assert.ok(items.length > 0, `${id}: sequence has real content`);
  assert.equal(section.match(/data-spine-anchor=/g)?.length, items.length, `${id}: one hub branch anchor per target`);
  assert.ok(items.every(item => !item.includes("data-reveal")), `${id}: generic reveal cannot bypass sequence`);
  assert.doesNotMatch(section, /inert=|aria-hidden="true"[^>]*data-spine-item|data-spine-item[^>]*aria-hidden="true"/);
  console.log(`PASS ${id}: hub sequence, per-item anchors, accessible SSR without generic reveal`);
  count++;
}
for (const path of ["/projects", "/blog", "/cv"]) {
  const route = await fetch(base + path);
  assert.equal(route.status, 200);
  const page = await route.text();
  // RSC can mention an undefined optional prop; isolation concerns rendered DOM attributes.
  assert.doesNotMatch(page, /<[^>]+\sdata-spine-(?:sequence|item)=/);
  assert.match(page, /class="secondary-spine"/);
  console.log(`PASS ${path}: standalone secondary motif isolated from landing choreography`);
  count++;
}
console.log(`Completed ${count} Phase 16 HTTP checks.`);
