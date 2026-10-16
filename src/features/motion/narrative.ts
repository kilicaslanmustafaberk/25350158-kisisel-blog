/** Pure choreography: scroll is the clock, not a time-based animation loop. */
export type NarrativeId = "hero" | "about" | "projects" | "skills" | "journey" | "certificates" | "blog" | "cv" | "github" | "contact";
export const narrativeIds: readonly NarrativeId[] = ["hero", "about", "projects", "skills", "journey", "certificates", "blog", "cv", "github", "contact"];
export const isNarrativeId = (value: string): value is NarrativeId => (narrativeIds as readonly string[]).includes(value);
export const clamp01 = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
export const smoothProgress = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
export function sectionProgress(top: number, height: number, scroll: number, viewport: number) {
  const progress = clamp01((scroll + viewport - top) / Math.max(1, height + viewport));
  return { progress, phase: progress < .25 ? "enter" : progress > .75 ? "exit" : "active" } as const;
}
export type Chapter = { id: NarrativeId; top: number; height: number };
/**
 * Active chapter plus the pair being blended. Reduced motion does not blend:
 * from/to snap to the active chapter so the scene shows a static section form.
 */
export function narrativeFrame(chapters: Chapter[], scroll: number, viewport: number, reduced = false) {
  if (!chapters.length) chapters = [{ id: "hero", top: 0, height: viewport }];
  const anchors = chapters.map((chapter, index) => index === 0 ? 0 : chapter.top - viewport * .32);
  let index = 0;
  while (index + 1 < anchors.length && scroll >= anchors[index + 1]) index++;
  const next = Math.min(index + 1, chapters.length - 1);
  const raw = next === index ? 0 : clamp01((scroll - anchors[index]) / Math.max(1, anchors[next] - anchors[index]));
  const active = raw >= .5 ? chapters[next].id : chapters[index].id;
  if (reduced) return { from: active, to: active, blend: 0, active };
  return { from: chapters[index].id, to: chapters[next].id, blend: smoothProgress(raw), active };
}
