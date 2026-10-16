/**
 * Data Spine (Phase 14): veri omurgası + mühendislik izi.
 *
 * ONE continuous route through the whole landing page. The route is a single
 * spline in document space (CSS px, relative to `.landing-page`). Sections do
 * not own a spine pose; they only contribute a *lane* (the column the route
 * runs through) and a *hub* (where it gathers energy and branches to content).
 * The renderer moves a viewport over this fixed route while the page scrolls,
 * so the spine can never "reset" between sections.
 *
 * Pure math only: no DOM, no React, no WebGL.
 */
import { clamp01, smoothProgress, type NarrativeId } from "./narrative";
import type { MotionQuality } from "./quality";

/** A section's lane, measured from the DOM (main-local CSS px). */
export type SpineLane = {
  id: string;
  /** Hub centre x; the route runs through the lane at this x. */
  x: number;
  top: number;
  bottom: number;
  hubY: number;
  /** Lane width; bounds the sway so the route stays out of content columns. */
  width: number;
  /** Calm lanes (Timeline) keep the route straighter and slimmer: an engineering trace. */
  calm: boolean;
};

export type SpineBounds = { top: number; bottom: number };
export type SpineHub = { id: string; x: number; y: number; u: number };
export type SpineRoute = {
  /** `count` samples of [x, y, girth, 0], uniform in arc length. */
  samples: Float32Array;
  count: number;
  /** Total arc length in px. */
  length: number;
  hubs: SpineHub[];
};

export type SpineControl = { x: number; y: number; girth: number; hub?: string };

export const ROUTE_STRIDE = 4;
/** WebGL2 guarantees MAX_TEXTURE_SIZE >= 2048, so the route texture always fits. */
export const ROUTE_SAMPLES = 2048;
export const MAX_HUBS = 12;

const finite = (...values: number[]) => values.every(Number.isFinite);

/**
 * Control points of the single route: start above the first hub, then for each
 * lane (in document order) enter at the lane top, sway gently, pass exactly
 * through the hub, sway, leave at the lane bottom; finally run to the end.
 * Transitions between lanes happen in the padding between sections, where no
 * content lives.
 */
export function routeControls(lanes: SpineLane[], bounds: SpineBounds, options: { mobile: boolean }): SpineControl[] {
  const sorted = lanes
    .filter(lane => finite(lane.x, lane.top, lane.bottom, lane.hubY, lane.width) && lane.bottom > lane.top)
    .sort((a, b) => a.top - b.top);
  if (!sorted.length) return [];
  const controls: SpineControl[] = [];
  const step = options.mobile ? 420 : 300;
  let sign = 1;
  const push = (point: SpineControl) => {
    const previous = controls.at(-1);
    if (!previous) { controls.push(point); return; }
    // Keep y strictly increasing so the route never loops back; a hub always wins its slot.
    if (point.y - previous.y >= 4) controls.push(point);
    else if (point.hub && !previous.hub) controls[controls.length - 1] = point;
  };
  const sway = (lane: SpineLane, from: number, to: number, girth: number) => {
    const amplitude = options.mobile ? Math.min(lane.width * .18, 4) : Math.min(lane.width * .26, 38) * (lane.calm ? .25 : 1);
    const count = Math.floor((to - from) / step);
    for (let i = 1; i <= count; i++) {
      push({ x: lane.x + sign * amplitude, y: from + (to - from) * i / (count + 1), girth });
      sign = -sign;
    }
  };
  const first = sorted[0];
  push({ x: first.x, y: Math.min(bounds.top, first.top), girth: .35 });
  for (const lane of sorted) {
    const girth = lane.calm ? .45 : 1;
    const hubY = Math.min(lane.bottom, Math.max(lane.top, lane.hubY));
    push({ x: lane.x, y: lane.top, girth: girth * .8 });
    sway(lane, lane.top, hubY, girth);
    push({ x: lane.x, y: hubY, girth, hub: lane.id });
    sway(lane, hubY, lane.bottom, girth);
    push({ x: lane.x, y: lane.bottom, girth: girth * .8 });
  }
  const last = sorted.at(-1)!;
  push({ x: last.x, y: Math.max(bounds.bottom, last.bottom), girth: .3 });
  return controls;
}

type Polyline = { x: number[]; y: number[]; girth: number[]; hubAt: Map<string, number> };

/** Centripetal Catmull-Rom (alpha 0.5): passes through every control, never cusps or self-loops. */
export function catmullRom(controls: SpineControl[], spacing = 6): Polyline {
  const out: Polyline = { x: [], y: [], girth: [], hubAt: new Map() };
  const n = controls.length;
  if (!n) return out;
  const at = (i: number) => {
    if (i < 0) { const a = controls[0], b = controls[1] ?? a; return { x: 2 * a.x - b.x, y: 2 * a.y - b.y }; }
    if (i >= n) { const a = controls[n - 1], b = controls[n - 2] ?? a; return { x: 2 * a.x - b.x, y: 2 * a.y - b.y }; }
    return controls[i];
  };
  const knot = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(1e-4, Math.hypot(b.x - a.x, b.y - a.y) ** .5);
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1), p1 = controls[i], p2 = controls[i + 1], p3 = at(i + 2);
    if (p1.hub) out.hubAt.set(p1.hub, out.x.length);
    const t1 = knot(p0, p1), t2 = t1 + knot(p1, p2), t3 = t2 + knot(p2, p3);
    const segments = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / spacing));
    for (let s = 0; s < segments; s++) {
      const t = t1 + (t2 - t1) * s / segments;
      const mix = (a: number, b: number, ta: number, tb: number) => (tb - t) / (tb - ta) * a + (t - ta) / (tb - ta) * b;
      const point = (key: "x" | "y") => {
        const a1 = mix(p0[key], p1[key], 0, t1), a2 = mix(p1[key], p2[key], t1, t2), a3 = mix(p2[key], p3[key], t2, t3);
        const b1 = mix(a1, a2, 0, t2), b2 = mix(a2, a3, t1, t3);
        return mix(b1, b2, t1, t2);
      };
      out.x.push(point("x")); out.y.push(point("y"));
      out.girth.push(p1.girth + (p2.girth - p1.girth) * s / segments);
    }
  }
  const end = controls[n - 1];
  if (end.hub) out.hubAt.set(end.hub, out.x.length);
  out.x.push(end.x); out.y.push(end.y); out.girth.push(end.girth);
  return out;
}

/** The whole landing route: controls → spline → `count` samples uniform in arc length. */
export function buildSpineRoute(lanes: SpineLane[], bounds: SpineBounds, options: { mobile: boolean; count?: number }): SpineRoute | null {
  const controls = routeControls(lanes, bounds, options);
  if (controls.length < 2) return null;
  const line = catmullRom(controls);
  const points = line.x.length;
  const cumulative = new Float64Array(points);
  for (let i = 1; i < points; i++) cumulative[i] = cumulative[i - 1] + Math.hypot(line.x[i] - line.x[i - 1], line.y[i] - line.y[i - 1]);
  const length = cumulative[points - 1];
  if (!(length > 0)) return null;
  const count = Math.max(2, Math.floor(options.count ?? ROUTE_SAMPLES));
  const samples = new Float32Array(count * ROUTE_STRIDE);
  let j = 0;
  for (let i = 0; i < count; i++) {
    const target = length * i / (count - 1);
    while (j < points - 2 && cumulative[j + 1] < target) j++;
    const span = cumulative[j + 1] - cumulative[j], f = span > 0 ? clamp01((target - cumulative[j]) / span) : 0;
    samples[i * ROUTE_STRIDE] = line.x[j] + (line.x[j + 1] - line.x[j]) * f;
    samples[i * ROUTE_STRIDE + 1] = line.y[j] + (line.y[j + 1] - line.y[j]) * f;
    samples[i * ROUTE_STRIDE + 2] = line.girth[j] + (line.girth[j + 1] - line.girth[j]) * f;
  }
  const hubs: SpineHub[] = [];
  for (const control of controls) {
    if (!control.hub) continue;
    const index = line.hubAt.get(control.hub);
    if (index === undefined) continue;
    hubs.push({ id: control.hub, x: control.x, y: control.y, u: cumulative[index] / length });
  }
  return { samples, count, length, hubs: hubs.slice(0, MAX_HUBS) };
}

/** Route point at arc parameter u (0..1), linearly interpolated between samples. */
export function routePoint(route: SpineRoute, u: number) {
  const f = clamp01(u) * (route.count - 1), i = Math.min(Math.floor(f), route.count - 2), t = f - i;
  const a = i * ROUTE_STRIDE, b = a + ROUTE_STRIDE, s = route.samples;
  return { x: s[a] + (s[b] - s[a]) * t, y: s[a + 1] + (s[b + 1] - s[a + 1]) * t, girth: s[a + 2] + (s[b + 2] - s[a + 2]) * t };
}

/** x of the route at document y (closest sample); used for mobile branch ticks. */
export function routeXAt(route: SpineRoute, y: number) {
  let best = 0, distance = Infinity;
  for (let i = 0; i < route.count; i++) {
    const d = Math.abs(route.samples[i * ROUTE_STRIDE + 1] - y);
    if (d < distance) { distance = d; best = i; }
  }
  return route.samples[best * ROUTE_STRIDE];
}

/** Decimated SVG path of the route: the WebGL-free trace and fallback. */
export function routePathData(route: SpineRoute, every = 4) {
  const parts: string[] = [];
  for (let i = 0; i < route.count; i += every) parts.push(`${route.samples[i * ROUTE_STRIDE].toFixed(1)} ${route.samples[i * ROUTE_STRIDE + 1].toFixed(1)}`);
  const last = (route.count - 1) * ROUTE_STRIDE;
  parts.push(`${route.samples[last].toFixed(1)} ${route.samples[last + 1].toFixed(1)}`);
  return `M${parts.join("L")}`;
}

type Point = { x: number; y: number };

/**
 * Branch from a hub to a content anchor. Desktop: a cubic with horizontal
 * tangents (cards read as outputs of the hub). Mobile: a narrow vertical
 * spread from that same hub, followed by a short horizontal connection.
 */
export function branchPath(from: Point, to: Point, mobile: boolean) {
  if (!finite(from.x, from.y, to.x, to.y)) return "";
  if (mobile) {
    const spread = from.x + Math.sign(to.x - from.x) * Math.min(10, Math.abs(to.x - from.x) * .35);
    return `M${from.x.toFixed(1)} ${from.y.toFixed(1)}L${spread.toFixed(1)} ${from.y.toFixed(1)}L${spread.toFixed(1)} ${to.y.toFixed(1)}L${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
  }
  const dx = to.x - from.x;
  return `M${from.x.toFixed(1)} ${from.y.toFixed(1)}C${(from.x + dx * .5).toFixed(1)} ${from.y.toFixed(1)} ${(to.x - dx * .5).toFixed(1)} ${to.y.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

/**
 * How "lit" a hub is (0..1) for the current viewport: hubs near the middle of
 * the screen activate, the rest of the spine stays calm. Emphasis moves along
 * the same structure; nothing is re-posed.
 */
export function hubActivation(hubY: number, viewTop: number, viewportHeight: number) {
  if (!finite(hubY, viewTop, viewportHeight) || viewportHeight <= 0) return 0;
  const distance = Math.abs(hubY - (viewTop + viewportHeight * .5));
  return 1 - smoothProgress(distance / (viewportHeight * .6));
}

/**
 * Progressive reveal: the route is fully lit up to this document y and dimmer
 * (never hidden) below it. Reduced motion lights the whole route.
 */
export function revealHead(viewTop: number, viewportHeight: number, reduced: boolean) {
  if (reduced || !finite(viewTop, viewportHeight)) return Number.MAX_SAFE_INTEGER;
  return viewTop + viewportHeight * .82;
}

/**
 * Phase 15 — the active white core. Document y the core "reads" from the
 * viewport: 40% down the screen, sliding towards 90% over the last screen of
 * scroll so the final (Contact) hub is always reachable at the page bottom.
 */
export function coreFocusY(viewTop: number, viewportHeight: number, remainingScroll: number) {
  if (!finite(viewTop, viewportHeight, remainingScroll) || viewportHeight <= 0) return 0;
  const nearEnd = smoothProgress(1 - Math.max(0, remainingScroll) / viewportHeight);
  // At the very top the focus starts on the viewport edge, so the core begins on the first (Hero) hub.
  const nearStart = smoothProgress(1 - Math.max(0, viewTop) / (viewportHeight * .5));
  return viewTop + viewportHeight * (.4 + .5 * nearEnd) * (1 - nearStart);
}

/**
 * Where the core should be (route u) for a focus y: it rests on a hub, then
 * travels along the route to the next hub with an eased, dwell-at-both-ends
 * curve. Pure and monotonic in focus y, so scrolling back retraces the path.
 */
export function coreTarget(hubs: SpineHub[], focusY: number, releases?: ReadonlyMap<string, number>) {
  if (!hubs.length || !Number.isFinite(focusY)) return hubs[0]?.u ?? 0;
  if (focusY <= hubs[0].y) return hubs[0].u;
  const last = hubs[hubs.length - 1];
  if (focusY >= last.y) return last.u;
  let i = 0;
  while (i + 1 < hubs.length - 1 && focusY >= hubs[i + 1].y) i++;
  const a = hubs[i], b = hubs[i + 1];
  const release = Math.min(b.y - 1, Math.max(a.y, releases?.get(a.id) ?? a.y));
  const t = clamp01((focusY - release) / Math.max(1, b.y - release));
  return lerp(a.u, b.u, smoothProgress((t - .18) / .64));
}

/** Section-local scroll interval: leave time for branch calls, then release the core to the next hub. */
export function branchSequenceEnd(hubY: number, itemYs: number[], nextHubY: number) {
  if (!Number.isFinite(hubY)) return 0;
  const last = Math.max(hubY + 120, ...itemYs.filter(Number.isFinite));
  return Math.max(hubY + 1, Math.min(last + 48, Number.isFinite(nextHubY) ? nextHubY - 80 : last + 48));
}

/** A branch is called first; its readable target is emphasised only after the line has begun to draw. */
export function branchSequence(focusY: number, hubY: number, endY: number, count: number, index: number, arrived: boolean) {
  if (!arrived || !finite(focusY, hubY, endY, count, index) || count < 1 || index < 0 || index >= count || endY <= hubY) return { branch: 0, item: 0 };
  const lead = Math.min(24, (endY - hubY) * .15);
  const progress = clamp01((focusY - hubY - lead) / Math.max(1, endY - hubY - lead));
  const call = clamp01(progress * count - index);
  return { branch: smoothProgress(call), item: smoothProgress((call - .35) / .65) };
}

/** Nearest hub to a route position; reduced motion parks the core there instead of travelling. */
export function nearestHubU(hubs: SpineHub[], u: number) {
  let best = hubs[0]?.u ?? 0;
  for (const hub of hubs) if (Math.abs(hub.u - u) < Math.abs(best - u)) best = hub.u;
  return best;
}

/** 0..1: how much the core has "arrived" at a hub (px of arc length between them). */
export function hubArrival(hubU: number, coreU: number, routeLength: number) {
  if (!finite(hubU, coreU, routeLength) || routeLength <= 0) return 0;
  return 1 - smoothProgress(Math.abs(hubU - coreU) * routeLength / 160);
}

/** Includes already-passed hubs on restored/deep-linked layouts; live forward travel still gates arrival. */
export function hasReachedHub(previousU: number, coreU: number, hubU: number, routeLength: number) {
  if (!finite(previousU, coreU, hubU, routeLength) || routeLength <= 0) return false;
  return Math.abs(hubU - coreU) * routeLength < .5 || (coreU >= hubU && (previousU < 0 || previousU <= hubU));
}

/** Endpoint-exact linear interpolation (t = 1 returns `to` bit-for-bit). */
export const lerp = (from: number, to: number, t: number) => from * (1 - t) + to * t;

/** Frame-rate independent exponential smoothing (critically damped feel). */
export function damp(current: number, target: number, lambda: number, dtSeconds: number) {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return current;
  return lerp(current, target, 1 - Math.exp(-lambda * Math.min(dtSeconds, .1)));
}

/** Deterministic PRNG for procedural layout; the same page always builds the same spine. */
export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * Geometry budget per quality tier. Topology is fixed at mount and independent
 * of page length: the route itself lives in a texture, so a layout change only
 * re-uploads 2048 samples.
 */
export const spineQuality = {
  static: { strands: 3, strandSegments: 1000, satellites: 150, links: 90, particles: 0, rings: 3, ringSegments: 56, fps: 0 },
  mobile: { strands: 2, strandSegments: 560, satellites: 70, links: 30, particles: 36, rings: 2, ringSegments: 40, fps: 30 },
  tablet: { strands: 3, strandSegments: 1000, satellites: 260, links: 150, particles: 90, rings: 3, ringSegments: 56, fps: 60 },
  desktop: { strands: 4, strandSegments: 1400, satellites: 520, links: 320, particles: 170, rings: 4, ringSegments: 72, fps: 60 },
} satisfies Record<MotionQuality, { strands: number; strandSegments: number; satellites: number; links: number; particles: number; rings: number; ringSegments: number; fps: number }>;

/** Lean of the Skill Universe's initial axis: vertical, like the page-wide spine it grows out of. */
export const SKILL_AXIS_LEAN = .12;

/**
 * Data Spine → network expansion → Skill Universe. 0 = skill nodes still lie on
 * a spine-like axis, 1 = full network. Leaving towards Timeline partially pulls
 * the network back towards the axis.
 */
export function skillEmergence(frame: { from: NarrativeId; to: NarrativeId; blend: number; reduced: boolean }) {
  if (frame.reduced) return 1;
  if (frame.to === "skills" && frame.from !== "skills") return smoothProgress(frame.blend);
  if (frame.from === "skills" && frame.to !== "skills") return 1 - clamp01(frame.blend) * .65;
  return 1;
}
