import assert from "node:assert/strict";
const base=process.env.TEST_BASE_URL ?? "http://localhost:3100";
const response=await fetch(base+"/"); assert.equal(response.status,200);
const body=await response.text(); let count=0;
for(const id of ["projects","journey","blog","cv","github","contact"]) {
  const section=body.match(new RegExp(`<section[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];
  if(!section) {assert.ok(["journey","cv","github"].includes(id));continue;}
  assert.match(section,/<div[^>]*data-pin-scene=""/);
  assert.match(section,/data-spine-item=""/);
  assert.doesNotMatch(section,/data-pin="enabled"/);
  console.log(`PASS ${id}: SSR sticky scene with readable no-JS native-flow fallback`);count++;
}
for(const id of ["hero","skills"]) {
 const section=body.match(new RegExp(`<section[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/section>`))?.[0];
 if(section) {assert.doesNotMatch(section,/data-pin-scene/);count++; console.log(`PASS ${id}: no forced pin`);}
}
console.log(`Completed ${count} Phase 17 HTTP checks.`);
