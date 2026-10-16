import assert from "node:assert/strict";
import test from "node:test";
import { clamp01, narrativeFrame, sectionProgress, smoothProgress, type Chapter } from "../src/features/motion/narrative";

// Phase 13 replaced the sphere morph; Phase 14 replaced per-section spine poses with one
// page-long route. The scroll-clock contract below (still used for chapters/ambient) is unchanged.
const chapters: Chapter[] = [{ id: "hero", top: 0, height: 1000 }, { id: "projects", top: 1000, height: 1500 }, { id: "contact", top: 2500, height: 800 }];
test("progress sanitizes nonfinite values and bounds", () => {
  for (const value of [-10, NaN, Infinity]) assert.equal(clamp01(value), 0);
  assert.equal(clamp01(10), 1); assert.equal(smoothProgress(.5), .5);
});
test("chapters have enter/active/exit phases", () => {
  assert.equal(sectionProgress(1000, 1000, 0, 600).phase, "enter");
  assert.equal(sectionProgress(1000, 1000, 1000, 600).phase, "active");
  assert.equal(sectionProgress(1000, 1000, 2200, 600).phase, "exit");
});
test("native scroll samples ordered available chapters, skipping optional sections", () => {
  assert.equal(narrativeFrame(chapters, 0, 600).active, "hero");
  assert.equal(narrativeFrame(chapters, 1000, 600).active, "projects");
  assert.equal(narrativeFrame(chapters, 3000, 600).active, "contact");
  assert.equal(narrativeFrame([], 0, 600).active, "hero");
});
test("morph continuity at chapter anchors and reverse scroll", () => {
  const anchor = 1000 - 600 * .32;
  const before = narrativeFrame(chapters, anchor - .001, 600), after = narrativeFrame(chapters, anchor, 600);
  assert.equal(before.from, "hero"); assert.equal(after.from, "projects");
  assert.ok(before.blend > .9999 && after.blend < .0001, "blend hands over continuously at the anchor");
  const forward = narrativeFrame(chapters, 400, 600);
  narrativeFrame(chapters, 1800, 600);
  const reversed = narrativeFrame(chapters, 400, 600);
  assert.deepEqual(reversed, forward); assert.ok(forward.blend > .4 && forward.blend < .6);
});
test("reduced motion snaps to the active chapter without blending", () => {
  const frame = narrativeFrame(chapters, 3000, 600, true);
  assert.equal(frame.active, "contact"); assert.equal(frame.from, "contact"); assert.equal(frame.to, "contact"); assert.equal(frame.blend, 0);
});
