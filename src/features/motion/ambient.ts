export function ambientProgress(scrollY: number, height: number, viewport: number): number {
  if (![scrollY, height, viewport].every(Number.isFinite)) return 0;
  return Math.min(1, Math.max(0, scrollY / Math.max(1, height - viewport)));
}

/** Soft glow sits on the page-wide spine's lane for the active chapter (vw, vh). */
export const ambientFocus: Record<string, [number, number]> = {
  hero: [56, 34], about: [50, 50], projects: [45, 50], skills: [57, 50],
  journey: [52, 45], blog: [43, 50], cv: [57, 50], github: [55, 50], contact: [48, 55],
};
