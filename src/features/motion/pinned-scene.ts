import { smoothProgress } from "./narrative";
import type { SpineRoute } from "./data-spine";

export type SceneMode = "traveling" | "enteringHub" | "pinnedSequence" | "leavingHub";
export type PinRange = { start: number; end: number; distance: number; enabled: boolean };
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Native sticky budget from visible targets, measured content and available viewport. */
export function pinRange(top: number, viewport: number, header: number, content: number, count: number, mobile: boolean, reduced: boolean): PinRange {
  const available = viewport - header - 32;
  const enabled = [top, viewport, header, content, count].every(Number.isFinite) && count > 0 && !reduced && available >= 400 && content <= available;
  // ~0.42 viewport per item: a normal wheel gesture visibly advances a branch without finishing it.
  const step = Math.min(mobile ? 300 : 440, Math.max(mobile ? 220 : 300, viewport * (mobile ? .36 : .42)));
  const distance = enabled ? Math.round(step * (count + .08)) : 0;
  const start = Number.isFinite(top - header - 16) ? top - header - 16 : 0;
  return { start, end: start + distance, distance, enabled };
}

export function sceneState(scroll: number, range: PinRange) {
  if (!range.enabled || !Number.isFinite(scroll)) return { mode: "traveling" as SceneMode, progress: 1, offset: 0 };
  const progress = clamp((scroll - range.start) / range.distance);
  const mode: SceneMode = scroll < range.start ? "enteringHub" : scroll <= range.end ? "pinnedSequence" : "leavingHub";
  return { mode, progress, offset: progress * range.distance };
}

/**
 * Each item segment: hub pulse (0–.08) → continuous branch draw (.08–.75) → endpoint pulse (.75–.86)
 * → item reveal (.84–1). Branch is linear in local progress so 20/50/80% draw is actually visible.
 */
export function pinnedBranch(progress: number, count: number, index: number) {
  if (![progress, count, index].every(Number.isFinite) || count < 1 || index < 0 || index >= count) return { branch: 0, item: 0, hubPulse: 0, endpointPulse: 0 };
  const call = clamp(clamp(progress) * (count + .08) - index);
  const pulse = (start: number, end: number) => {
    const t = clamp((call - start) / (end - start));
    return 4 * t * (1 - t);
  };
  return { branch: clamp((call - .08) / .67), item: smoothProgress((call - .84) / .16), hubPulse: pulse(0, .08), endpointPulse: pulse(.75, .86) };
}

/** Deform an existing buffer in place; preserve route u and avoid spline/texture reconstruction per frame. */
export function shiftStickyRoute(base: SpineRoute, visual: SpineRoute, offsets: number[]) {
  let hub = 0;
  for (let i = 0; i < base.count; i++) {
    const u = i / (base.count - 1);
    while (hub + 1 < base.hubs.length - 1 && u > base.hubs[hub + 1].u) hub++;
    const a = base.hubs[hub], b = base.hubs[Math.min(hub + 1, base.hubs.length - 1)];
    const f = b.u > a.u ? smoothProgress((u - a.u) / (b.u - a.u)) : 0;
    const offset = (offsets[hub] ?? 0) * (1 - f) + (offsets[Math.min(hub + 1, base.hubs.length - 1)] ?? 0) * f;
    visual.samples[i * 4 + 1] = base.samples[i * 4 + 1] + offset;
  }
  visual.hubs.forEach((hub, i) => { hub.y = base.hubs[i].y + (offsets[i] ?? 0); });
}
