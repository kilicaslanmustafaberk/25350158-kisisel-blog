export type MotionQuality = "static" | "mobile" | "tablet" | "desktop";

type QualityInput = {
  reducedMotion: boolean;
  viewportWidth: number;
  hardwareConcurrency?: number;
};

export function selectMotionQuality({ reducedMotion, viewportWidth, hardwareConcurrency }: QualityInput): MotionQuality {
  if (reducedMotion) return "static";
  if (viewportWidth < 640 || (hardwareConcurrency !== undefined && hardwareConcurrency <= 2)) return "mobile";
  if (viewportWidth < 1024 || (hardwareConcurrency !== undefined && hardwareConcurrency <= 4)) return "tablet";
  return "desktop";
}

export function clampPixelRatio(devicePixelRatio: number, quality: MotionQuality) {
  const safeRatio = Number.isFinite(devicePixelRatio) ? Math.max(1, devicePixelRatio) : 1;
  const cap = quality === "desktop" ? 1.5 : quality === "tablet" ? 1.25 : 1;
  return Math.min(safeRatio, cap);
}


/**
 * Phase 7: true while a modal (command palette, terminal, lightbox) is open.
 * Decorative canvases skip frames meanwhile; renderers are not recreated.
 */
export function isOverlayOpen() {
  return typeof document !== "undefined" && document.documentElement.dataset.overlay === "open";
}
