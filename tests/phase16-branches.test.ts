import assert from "node:assert/strict";
import test from "node:test";
import { branchPath, branchSequence, branchSequenceEnd, coreTarget, hasReachedHub } from "../src/features/motion/data-spine";

const hubs = [{ id: "hero", x: 100, y: 100, u: .1 }, { id: "projects", x: 200, y: 600, u: .3 }, { id: "journey", x: 100, y: 1600, u: .7 }, { id: "contact", x: 200, y: 2600, u: .95 }];

test("desktop and mobile item branches share the actual hub origin at different item heights", () => {
  for (const mobile of [false, true]) {
    for (const y of [620, 760, 940]) {
      assert.ok(branchPath({ x: 200, y: 600 }, { x: 240, y }, mobile).startsWith("M200.0 600.0"));
    }
  }
});

test("core remains on a branched hub for its sequence, then resumes monotonic travel to the next hub", () => {
  const releases = new Map([["projects", 1100]]);
  for (let y = 600; y <= 1100; y += 10) assert.equal(coreTarget(hubs, y, releases), .3);
  assert.ok(coreTarget(hubs, 1400, releases) > .3);
  assert.equal(coreTarget(hubs, 1600, releases), .7);
  let previous = -1;
  for (let y = 0; y < 2800; y += 5) {
    const u = coreTarget(hubs, y, releases);
    assert.ok(u >= previous); previous = u;
  }
  assert.equal(coreTarget(hubs, 700, releases), .3, "reverse scroll retraces the held hub");
});

test("no item or branch is called before core arrival, even if scroll focus is ahead", () => {
  for (let i = 0; i < 3; i++) assert.deepEqual(branchSequence(1200, 600, 1100, 3, i, false), { branch: 0, item: 0 });
  assert.deepEqual(branchSequence(600, 600, 1100, 3, 0, true), { branch: 0, item: 0 }, "arrival precedes first call");
});

test("branch draws before its item is emphasised; later items cannot overtake earlier ones", () => {
  const early = branchSequence(660, 600, 1100, 3, 0, true);
  assert.ok(early.branch > 0); assert.equal(early.item, 0);
  const first = branchSequence(780, 600, 1100, 3, 0, true);
  assert.ok(first.item > .9);
  assert.equal(branchSequence(780, 600, 1100, 3, 1, true).item, 0);
  for (let y = 600; y <= 1100; y += 10) {
    const states = [0, 1, 2].map(i => branchSequence(y, 600, 1100, 3, i, true));
    assert.ok(states[0].item >= states[1].item && states[1].item >= states[2].item);
    assert.ok(states.every(state => state.branch >= state.item));
  }
  for (let i = 0; i < 3; i++) assert.deepEqual(branchSequence(1100, 600, 1100, 3, i, true), { branch: 1, item: 1 });
});

test("sequence reverses with scroll and single panel/empty state has the same arrival gate", () => {
  assert.equal(branchSequence(1100, 600, 1100, 1, 0, true).item, 1);
  assert.equal(branchSequence(600, 600, 1100, 1, 0, true).item, 0);
  assert.ok(branchSequence(900, 600, 1100, 1, 0, true).item > branchSequence(800, 600, 1100, 1, 0, true).item);
});

test("release window stays before the next hub and invalid/short layouts stay finite", () => {
  assert.equal(branchSequenceEnd(600, [650, 900, NaN], 1600), 948);
  assert.equal(branchSequenceEnd(600, [1900], 1600), 1520);
  assert.equal(branchSequenceEnd(NaN, [], 1600), 0);
  assert.deepEqual(branchSequence(NaN, 0, 100, 3, 0, true), { branch: 0, item: 0 });
  assert.deepEqual(branchSequence(100, 0, 100, 3, -1, true), { branch: 0, item: 0 });
  assert.deepEqual(branchSequence(5, 0, 5, 1, 0, true), { branch: 1, item: 1 });
});

test("restored scroll and resize retain passed branch state without calling a hub still ahead of the core", () => {
  assert.equal(hasReachedHub(-1, .7, .3, 4000), true);
  assert.equal(hasReachedHub(-1, .3, .7, 4000), false);
  assert.equal(hasReachedHub(.29, .3, .3, 4000), true);
  assert.equal(hasReachedHub(.29, .299, .3, 4000), false, "must park within half a pixel");
  assert.equal(hasReachedHub(.2, .5, .3, 4000), true, "fast forward scroll crosses hub before offscreen calls");
  assert.equal(hasReachedHub(NaN, .3, .3, 4000), false);
});
