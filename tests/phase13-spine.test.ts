import assert from "node:assert/strict";
import test from "node:test";

// Phase 14 rewrote this suite: the Phase 13 per-section spine poses (spineStates,
// spineTarget, connectorStrength…) were removed because they made the spine feel
// section-local. The contract is now ONE continuous page-long route.
import * as spine from "../src/features/motion/data-spine";
import {
  branchPath, buildSpineRoute, coreFocusY, coreTarget, damp, hubActivation, hubArrival, nearestHubU, MAX_HUBS, revealHead, ROUTE_SAMPLES, ROUTE_STRIDE, routeControls, routePathData, routePoint,
  routeXAt, skillEmergence, spineQuality, type SpineLane,
} from "../src/features/motion/data-spine";
import { clampPixelRatio } from "../src/features/motion/quality";

// A desktop landing: lanes zig-zag like the reference (hero → projects → timeline → blog → cv → github → contact).
const lanes: SpineLane[] = [
  { id: "hero", x: 800, top: 80, bottom: 700, hubY: 290, width: 150, calm: false },
  { id: "projects", x: 650, top: 950, bottom: 1400, hubY: 1170, width: 150, calm: false },
  { id: "journey", x: 740, top: 1650, bottom: 2350, hubY: 1700, width: 150, calm: true },
  { id: "blog", x: 620, top: 2600, bottom: 2950, hubY: 2780, width: 150, calm: false },
  { id: "cv", x: 810, top: 3200, bottom: 3450, hubY: 3320, width: 150, calm: false },
  { id: "github", x: 790, top: 3700, bottom: 4500, hubY: 4100, width: 150, calm: false },
  { id: "contact", x: 690, top: 4750, bottom: 5200, hubY: 4980, width: 150, calm: false },
];
const bounds = { top: 0, bottom: 5400 };
const route = buildSpineRoute(lanes, bounds, { mobile: false })!;
const at = (i: number) => ({ x: route.samples[i * ROUTE_STRIDE], y: route.samples[i * ROUTE_STRIDE + 1], girth: route.samples[i * ROUTE_STRIDE + 2] });

test("one route for the whole page: a single spline, no per-section spine states remain", () => {
  assert.ok(route);
  assert.equal(route.count, ROUTE_SAMPLES);
  for (const removed of ["spineStates", "spineTarget", "spineStateFor", "lerpSpineState", "spineSectionMap"]) assert.equal(removed in spine, false, removed);
  assert.equal(route.hubs.length, lanes.length);
});

test("continuity: uniform arc-length samples with no gaps or jumps from hero to contact", () => {
  const step = route.length / (route.count - 1);
  for (let i = 1; i < route.count; i++) {
    const a = at(i - 1), b = at(i), d = Math.hypot(b.x - a.x, b.y - a.y);
    assert.ok(Number.isFinite(d) && d < step * 1.05 + .01, `jump at sample ${i}: ${d} vs ${step}`);
  }
  assert.ok(Math.abs(at(0).y - bounds.top) < 1, "starts at the top of the landing");
  assert.ok(Math.abs(at(route.count - 1).y - bounds.bottom) < 1, "ends at the contact/footer edge");
});

test("the route never turns back up the page (no loops between sections)", () => {
  for (let i = 1; i < route.count; i++) assert.ok(at(i).y >= at(i - 1).y - 1, `y regresses at ${i}`);
});

test("hubs: the route passes exactly through every hub, in document order", () => {
  let previous = -1;
  route.hubs.forEach((hub, i) => {
    assert.equal(hub.id, lanes[i].id);
    assert.ok(hub.u > previous && hub.u >= 0 && hub.u <= 1); previous = hub.u;
    const p = routePoint(route, hub.u);
    assert.ok(Math.hypot(p.x - lanes[i].x, p.y - lanes[i].hubY) < 2, `${hub.id} off by ${Math.hypot(p.x - lanes[i].x, p.y - lanes[i].hubY)}`);
  });
});

test("inside each lane the route sways but stays in the lane (never crosses content columns)", () => {
  for (let i = 0; i < route.count; i++) {
    const p = at(i), lane = lanes.find(item => p.y >= item.top && p.y <= item.bottom);
    if (!lane) continue;
    // Calm lanes stay within a tenth of the lane (entry curves included); others within the sway cap plus spline overshoot.
    const limit = lane.calm ? lane.width * .11 : 44;
    assert.ok(Math.abs(p.x - lane.x) <= limit, `${lane.id}: ${Math.abs(p.x - lane.x)}px from lane centre`);
  }
});

test("timeline is the calm engineering trace: straighter and slimmer than the rest", () => {
  const girthIn = (id: string) => { const lane = lanes.find(item => item.id === id)!; let max = 0; for (let i = 0; i < route.count; i++) { const p = at(i); if (p.y > lane.top + 10 && p.y < lane.bottom - 10) max = Math.max(max, p.girth); } return max; };
  assert.ok(girthIn("journey") <= .46 && girthIn("projects") >= .99);
});

test("mobile: the same single route hugs one gutter with almost no sway", () => {
  const mobileLanes = lanes.map(lane => ({ ...lane, x: 27, width: 22 }));
  const mobile = buildSpineRoute(mobileLanes, bounds, { mobile: true })!;
  for (let i = 0; i < mobile.count; i++) assert.ok(Math.abs(mobile.samples[i * ROUTE_STRIDE] - 27) <= 5);
  assert.equal(mobile.hubs.length, lanes.length);
});

test("robustness: invalid/empty/overlapping lanes never produce NaN or loops", () => {
  assert.equal(buildSpineRoute([], bounds, { mobile: false }), null);
  const messy = [...lanes, { id: "bad", x: NaN, top: 10, bottom: 20, hubY: 15, width: 100, calm: false }, { id: "overlap", x: 700, top: 600, bottom: 800, hubY: 700, width: 150, calm: false }];
  const result = buildSpineRoute(messy, bounds, { mobile: false })!;
  assert.ok(result.samples.every(Number.isFinite));
  assert.ok(!result.hubs.some(hub => hub.id === "bad"));
  const controls = routeControls(messy, bounds, { mobile: false });
  for (let i = 1; i < controls.length; i++) assert.ok(controls[i].y > controls[i - 1].y);
  const many = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, x: 500, top: i * 400, bottom: i * 400 + 300, hubY: i * 400 + 150, width: 150, calm: false }));
  assert.equal(buildSpineRoute(many, { top: 0, bottom: 8200 }, { mobile: false })!.hubs.length, MAX_HUBS);
});

test("deterministic: the same layout always yields the same route (scroll never rebuilds it)", () => {
  const again = buildSpineRoute(lanes, bounds, { mobile: false })!;
  assert.deepEqual(Array.from(again.samples), Array.from(route.samples));
});

test("hub activation follows the viewport along the same structure", () => {
  assert.equal(hubActivation(1450, 1000, 900), 1);
  assert.equal(hubActivation(4000, 1000, 900), 0);
  assert.ok(hubActivation(1450 + 200, 1000, 900) > 0 && hubActivation(1450 + 200, 1000, 900) < 1);
  assert.equal(hubActivation(NaN, 0, 900), 0); assert.equal(hubActivation(0, 0, 0), 0);
});

test("progressive reveal: lit ahead of the fold, whole route lit in reduced motion", () => {
  assert.equal(revealHead(1000, 1000, false), 1820);
  assert.equal(revealHead(1000, 1000, true), Number.MAX_SAFE_INTEGER);
});

test("branches: desktop fan-out and mobile narrow spread start at the hub; invalid input draws nothing", () => {
  assert.equal(branchPath({ x: 100, y: 200 }, { x: 300, y: 260 }, false), "M100.0 200.0C200.0 200.0 200.0 260.0 300.0 260.0");
  assert.equal(branchPath({ x: 27, y: 900 }, { x: 50, y: 1000 }, true), "M27.0 900.0L35.0 900.0L35.0 1000.0L50.0 1000.0");
  assert.equal(branchPath({ x: NaN, y: 0 }, { x: 1, y: 1 }, false), "");
  const hub = route.hubs[1];
  assert.ok(Math.abs(routeXAt(route, hub.y) - hub.x) < 2);
  const d = routePathData(route);
  assert.match(d, /^M[\d.]+ [\d.]+L/);
  assert.ok(d.endsWith(`${at(route.count - 1).x.toFixed(1)} ${at(route.count - 1).y.toFixed(1)}`));
});

test("quality tiers: mobile < tablet <= desktop; static has no moving particles; DPR capped", () => {
  for (const key of ["strands", "strandSegments", "satellites", "links", "particles", "rings", "ringSegments"] as const) {
    assert.ok(spineQuality.mobile[key] < spineQuality.tablet[key], key);
    assert.ok(spineQuality.tablet[key] <= spineQuality.desktop[key], key);
  }
  assert.equal(spineQuality.static.particles, 0);
  assert.equal(spineQuality.mobile.fps, 30);
  assert.equal(clampPixelRatio(3, "mobile"), 1);
  assert.equal(clampPixelRatio(3, "desktop"), 1.5);
});

test("damping is frame-rate independent; skill emergence still grows out of the spine", () => {
  let sixty = 0; for (let i = 0; i < 60; i++) sixty = damp(sixty, 1, 5, 1 / 60);
  let thirty = 0; for (let i = 0; i < 30; i++) thirty = damp(thirty, 1, 5, 1 / 30);
  assert.ok(Math.abs(sixty - thirty) < 1e-9);
  assert.equal(damp(.3, 1, 5, NaN), .3);
  assert.equal(skillEmergence({ from: "projects", to: "skills", blend: 0, reduced: false }), 0);
  assert.equal(skillEmergence({ from: "projects", to: "skills", blend: 1, reduced: false }), 1);
  assert.equal(skillEmergence({ from: "projects", to: "skills", blend: .3, reduced: true }), 1);
});

// ---- Phase 15: the active white core ----
test("core focus: starts at the top, reads 40% down the viewport, reaches the page end", () => {
  assert.equal(coreFocusY(0, 900, 4000), 0, "top of page → focus on the viewport edge (hero hub)");
  assert.ok(Math.abs(coreFocusY(2000, 900, 3000) - 2360) < 1e-6, "mid page → 40% down");
  assert.ok(Math.abs(coreFocusY(3000, 900, 0) - 3810) < 1e-6, "page end → 90% down so the last hub is reachable");
  let previous = -Infinity;
  for (let top = 0; top <= 4000; top += 10) { const y = coreFocusY(top, 900, 4000 - top); assert.ok(y >= previous - 1e-9, `focus regresses at ${top}`); previous = y; }
  assert.equal(coreFocusY(NaN, 900, 0), 0);
});

test("core target rests on hubs, travels between them eased, and is monotonic (reverse scroll retraces)", () => {
  const hubs = route.hubs;
  assert.equal(coreTarget(hubs, -100), hubs[0].u);
  assert.equal(coreTarget(hubs, hubs[0].y), hubs[0].u);
  assert.equal(coreTarget(hubs, 1e9), hubs.at(-1)!.u);
  const a = hubs[1], b = hubs[2];
  assert.equal(coreTarget(hubs, a.y + (b.y - a.y) * .1), a.u, "dwells on the hub it just reached");
  assert.equal(coreTarget(hubs, a.y + (b.y - a.y) * .9), b.u, "already parked on the next hub");
  const mid = coreTarget(hubs, (a.y + b.y) / 2);
  assert.ok(Math.abs(mid - (a.u + b.u) / 2) < 1e-9, "eased curve is symmetric");
  let previous = -1;
  for (let y = 0; y <= 5400; y += 5) { const u = coreTarget(hubs, y); assert.ok(u >= previous - 1e-12); previous = u; }
  assert.equal(coreTarget([], 100), 0);
});

test("reduced motion parks the core on the nearest hub; arrival is 1 on the hub and fades within ~160px", () => {
  const hubs = route.hubs;
  assert.equal(nearestHubU(hubs, hubs[2].u + .001), hubs[2].u);
  assert.equal(hubArrival(.5, .5, route.length), 1);
  assert.equal(hubArrival(.5, .5 + 200 / route.length, route.length), 0);
  const near = hubArrival(.5, .5 + 40 / route.length, route.length);
  assert.ok(near > .55 && near < 1, "a core 40px away still counts as arrived");
  assert.equal(hubArrival(NaN, .5, route.length), 0);
});

