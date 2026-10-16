import assert from "node:assert/strict";
import test from "node:test";

import { clampPixelRatio, selectMotionQuality } from "../src/features/motion/quality";
import { buildPublicSkillUniverse } from "../src/features/skills/public-skill-universe";
import { buildCareerTimeline } from "../src/features/timeline/build-timeline";

test("reduced motion always selects the static tier", () => {
  assert.equal(selectMotionQuality({ reducedMotion: true, viewportWidth: 1600, hardwareConcurrency: 16 }), "static");
});

test("quality selection accounts for viewport and low-power hardware", () => {
  assert.equal(selectMotionQuality({ reducedMotion: false, viewportWidth: 390, hardwareConcurrency: 8 }), "mobile");
  assert.equal(selectMotionQuality({ reducedMotion: false, viewportWidth: 1280, hardwareConcurrency: 4 }), "tablet");
  assert.equal(selectMotionQuality({ reducedMotion: false, viewportWidth: 1440, hardwareConcurrency: 8 }), "desktop");
});

test("pixel ratio is capped by quality tier", () => {
  assert.equal(clampPixelRatio(3, "desktop"), 1.5);
  assert.equal(clampPixelRatio(2, "tablet"), 1.25);
  assert.equal(clampPixelRatio(2, "mobile"), 1);
  assert.equal(clampPixelRatio(Number.NaN, "desktop"), 1);
});

test("timeline excludes projects and sorts education and experience deterministically", () => {
  const input = {
    education: [{ id: "e1", institution: "University", program: "CS", startDate: "2022-09", description: null }],
    experience: [{ id: "x1", organization: "Studio", position: "Engineer", startDate: "2025-01", description: "Built systems" }],
    projects: [
      { id: "p1", title: "Portfolio", slug: "portfolio", projectDate: "2026-04", shortDescription: "Public work" },
      { id: "p2", title: "Draft date", slug: "draft-date", projectDate: null, shortDescription: "No date" },
    ],
  };
  const timeline = buildCareerTimeline(input);
  assert.deepEqual(timeline.map((item) => item.id), ["experience-x1", "education-e1"]);
  assert.equal(timeline[0].href, null);
  assert.equal(timeline[0].year, "2025");
});

test("public skill DTO counts only the supplied published-project relations", () => {
  const result = buildPublicSkillUniverse(
    [{ id: "s1", slug: "typescript", name: "TypeScript", category: "Language" }, { id: "s2", slug: "nextjs", name: "Next.js", category: "Framework" }],
    [{ skillId: "s1" }, { skillId: "s1" }],
  );
  assert.deepEqual(result.map(({ id, publicProjectCount }) => ({ id, publicProjectCount })), [
    { id: "s1", publicProjectCount: 2 },
    { id: "s2", publicProjectCount: 0 },
  ]);
});
