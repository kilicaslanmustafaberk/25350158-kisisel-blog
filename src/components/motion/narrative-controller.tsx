"use client";

import { useEffect, useRef } from "react";
import { ambientFocus, ambientProgress } from "@/features/motion/ambient";
import { isNarrativeId, narrativeFrame, sectionProgress, type Chapter, type NarrativeId } from "@/features/motion/narrative";
import { publishNarrative, resetNarrative } from "@/features/motion/narrative-store";

// Scroll clock for the landing. Phase 14: the Data Spine itself is drawn by <DataSpine> as one
// page-long route; this controller only publishes chapter/reduced/visibility state and the ambient layer.

export function NarrativeController() {
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = layerRef.current, root = document.querySelector<HTMLElement>(".landing-page");
    if (!layer || !root) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const sections = [...root.querySelectorAll<HTMLElement>(":scope > section[id]")].filter(section => isNarrativeId(section.id));
    const cues = [...root.querySelectorAll<HTMLAnchorElement>(".narrative-index a")];
    const indexNav = root.querySelector<HTMLElement>(".narrative-index"), cueIds = cues.map(cue => cue.hash.slice(1));
    let chapters: Chapter[] = [], frame = 0, forcedReduced = false;
    const reduced = () => preference.matches || forcedReduced;
    const update = () => {
      frame = 0;
      const y = window.scrollY, vh = window.innerHeight;
      const state = narrativeFrame(chapters, y, vh, reduced());
      const progress = ambientProgress(y, document.documentElement.scrollHeight, vh);
      root.dataset.narrativeMotion = reduced() ? "reduced" : "full";
      if (toggle) { toggle.setAttribute("aria-pressed", String(reduced())); toggle.disabled = preference.matches; }
      layer.dataset.activeSection = state.active;
      const [x, focusY] = reduced() ? ambientFocus.hero : ambientFocus[state.active] ?? ambientFocus.hero;
      layer.style.opacity = document.hidden ? "0" : "1";
      layer.style.setProperty("--ambient-x", `${x}vw`); layer.style.setProperty("--ambient-y", `${focusY}vh`);
      layer.style.setProperty("--grid-offset", `${reduced() ? 0 : -progress * 240}px`);
      layer.style.setProperty("--signal-offset", `${reduced() ? 0 : progress * 160}px`);
      const indicator = root.querySelector<HTMLElement>(".narrative-progress span");
      if (indicator) indicator.style.transform = `scaleY(${progress})`;
      let activeProgress = 0;
      sections.forEach((section, index) => {
        const local = sectionProgress(chapters[index].top, chapters[index].height, y, vh);
        if (section.id === state.active) activeProgress = local.progress;
        section.dataset.chapterPhase = local.phase;
        section.dataset.chapterActive = String(section.id === state.active);
      });
      // Phase 15: once the Data Spine route is ready, the white core drives the indicator (data-spine.tsx);
      // this scroll-chapter fallback only runs before that or without the route.
      const spineDriven = root.dataset.spine === "ready";
      if (!spineDriven) cues.forEach(cue => { if (cue.hash === `#${state.active}`) cue.setAttribute("aria-current", "location"); else cue.removeAttribute("aria-current"); });
      // Chapter indicator track fills continuously between chapters (no jump cuts).
      if (!spineDriven && indexNav && cueIds.length > 1) {
        const from = cueIds.indexOf(state.from), to = cueIds.indexOf(state.to);
        const position = reduced() || from < 0 || to < 0 ? Math.max(0, cueIds.indexOf(state.active)) : from + (to - from) * state.blend;
        indexNav.style.setProperty("--index-progress", Math.min(1, Math.max(0, position / (cueIds.length - 1))).toFixed(4));
      }
      const rect = root.getBoundingClientRect();
      layer.style.visibility = rect.bottom <= 0 || rect.top >= vh ? "hidden" : "visible";
      publishNarrative({ ...state, progress, activeProgress, reduced: reduced(), mobile: window.innerWidth < 768, visible: rect.bottom > 0 && rect.top < vh && !document.hidden });
    };
    const schedule = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(update); };
    const measure = () => { chapters = sections.map(section => ({ id: section.id as NarrativeId, top: section.getBoundingClientRect().top + window.scrollY, height: section.offsetHeight })); schedule(); };
    const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; publishNarrative({ ...narrativeFrame(chapters, window.scrollY, window.innerHeight, reduced()), progress: 0, activeProgress: 0, reduced: reduced(), mobile: window.innerWidth < 768, visible: false }); } else measure(); };
    const toggle = root.querySelector<HTMLButtonElement>(".motion-toggle");
    const toggleMotion = () => { forcedReduced = !forcedReduced; schedule(); };
    const observer = new ResizeObserver(measure); observer.observe(root); sections.forEach(section => observer.observe(section));
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", visibility); preference.addEventListener("change", schedule); toggle?.addEventListener("click", toggleMotion);
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", measure); document.removeEventListener("visibilitychange", visibility); preference.removeEventListener("change", schedule); toggle?.removeEventListener("click", toggleMotion); resetNarrative(); };
  }, []);
  return <>
    <div ref={layerRef} className="landing-background" data-active-section="hero" aria-hidden="true"><div className="ambient-grid" /><div className="ambient-light" /><div className="ambient-signals" /></div>
    <div className="narrative-progress" aria-hidden="true"><span /></div>
  </>;
}
