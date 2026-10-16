"use client";

import { useEffect, useRef } from "react";

import {
  branchPath, branchSequence, branchSequenceEnd, buildSpineRoute, coreFocusY, coreTarget, damp, hasReachedHub, hubArrival, nearestHubU, routePathData, routePoint,
  type SpineLane, type SpineRoute,
} from "@/features/motion/data-spine";
import { subscribeNarrative } from "@/features/motion/narrative-store";
import { pinRange, pinnedBranch, sceneState, type PinRange } from "@/features/motion/pinned-scene";
import { selectMotionQuality } from "@/features/motion/quality";
import type { SpineRenderer } from "@/components/three/data-spine-renderer";

const MOBILE_QUERY = "(max-width: 55.99rem)";
const SVG_NS = "http://www.w3.org/2000/svg";

/** Layout position inside `root`, ignoring CSS transforms (reveal animations must not bend the route). */
function offsetWithin(element: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0, node: HTMLElement | null = element;
  while (node && node !== root) {
    x += node.offsetLeft; y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  if (node === root) return { x, y };
  const rect = element.getBoundingClientRect(), base = root.getBoundingClientRect();
  return { x: rect.left - base.left, y: rect.top - base.top };
}

const center = (element: HTMLElement, root: HTMLElement) => {
  const p = offsetWithin(element, root);
  return { x: p.x + element.offsetWidth / 2, y: p.y + element.offsetHeight / 2 };
};

type BranchState = { group: SVGGElement; item: HTMLElement | null; y: number; value: string };
type HubState = { element: HTMLElement; section: HTMLElement | null; u: number; y: number; endY: number; branches: BranchState[]; arrived: boolean; reached: boolean; pin?: PinRange };

/**
 * Phase 17 Data Spine: one continuous route, native sticky branch scenes.
 * - Sections declare a lane + hub (`[data-spine-lane]`) and content anchors (`[data-spine-anchor]`).
 *   All branches start at the local hub; item anchors are called in DOM order after core arrival.
 * - The route is measured once per layout change and drawn from the same data as an SVG trace/branch
 *   layer (always present, WebGL-free fallback) and a lazily loaded WebGL layer.
 * - A white core travels along the route with scroll (eased, dwelling on hubs); a section is
 *   "arrived" while the core sits on its hub, which brightens its hub, branches and anchors.
 * Everything here is decorative: aria-hidden and pointer-events: none.
 */
export function DataSpine() {
  const layerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const traceRef = useRef<SVGPathElement>(null);
  const branchesRef = useRef<SVGGElement>(null);
  const coreRef = useRef<SVGGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current, svg = svgRef.current, trace = traceRef.current, branches = branchesRef.current, core = coreRef.current, host = canvasRef.current;
    const root = layer?.closest<HTMLElement>(".landing-page");
    if (!layer || !svg || !trace || !branches || !core || !host || !root) return;
    const mobileQuery = matchMedia(MOBILE_QUERY);
    let route: SpineRoute | null = null, hubs: HubState[] = [];
    let renderer: SpineRenderer | null = null, disposed = false, measureFrame = 0, coreFrame = 0, reduced = false, visible = true;
    let coreU = -1, lastTime = 0;
    let initialAnchorAligned = false;
    const arrivals: number[] = [];
    const releases = new Map<string, number>();
    let originY = 0;
    // World space = page layout with every sticky pin gap removed. The route, hubs, branches and core
    // live there once per layout; scroll only moves the world view, and a pinned scene freezes it.
    let gaps: { top: number; start: number; distance: number }[] = [], rootLeft = 0, frozen = false;
    const toWorld = (y: number) => gaps.reduce((sum, gap) => y >= gap.top ? sum - gap.distance : sum, y);
    const pinnedScroll = (scroll: number) => gaps.reduce((sum, gap) => sum + Math.min(gap.distance, Math.max(0, scroll - gap.start)), 0);
    const worldTop = (scroll = window.scrollY) => scroll - originY - pinnedScroll(scroll);
    const header = document.querySelector<HTMLElement>(".site-header");
    const measureOrigin = () => { originY = root.getBoundingClientRect().top + window.scrollY; };

    const measure = () => {
      if (disposed) return;
      measureFrame = 0;
      measureOrigin();
      root.dataset.spineMeasuring = "true";
      const mobile = mobileQuery.matches;
      // Reset before reading intrinsic content height: sticky height must not feed its own fit test.
      const scenes = new Map<HTMLElement, PinRange>();
      root.querySelectorAll<HTMLElement>("[data-spine-sequence]").forEach(section => {
        section.style.removeProperty("--pin-height"); section.style.removeProperty("--pin-viewport");
        delete section.dataset.pin;
      });
      root.querySelectorAll<HTMLElement>("[data-spine-sequence]").forEach(section => {
        const scene = section.querySelector<HTMLElement>("[data-pin-scene]");
        if (!scene) return;
        const headerHeight = header?.offsetHeight ?? 0;
        const range = pinRange(offsetWithin(section, root).y + originY, window.innerHeight, headerHeight, scene.offsetHeight, section.querySelectorAll("[data-spine-item]").length, mobile, reduced);
        section.dataset.pin = range.enabled ? "enabled" : "bypass";
        section.style.setProperty("--pin-top", `${headerHeight + 16}px`);
        if (range.enabled) {
          const height = window.innerHeight - headerHeight - 32;
          section.style.setProperty("--pin-viewport", `${height}px`);
          section.style.setProperty("--pin-height", `${height + range.distance}px`);
        }
        scenes.set(section, range);
      });
      gaps = [...scenes].filter(([, range]) => range.enabled).map(([section, range]) => {
        const scene = section.querySelector<HTMLElement>("[data-pin-scene]")!;
        return { top: offsetWithin(scene, root).y + scene.offsetHeight, start: range.start, distance: range.distance };
      }).sort((a, b) => a.top - b.top);
      rootLeft = root.getBoundingClientRect().left;
      const width = root.offsetWidth, height = toWorld(root.offsetHeight);
      const lanes: (SpineLane & { hub: HTMLElement })[] = [];
      for (const element of root.querySelectorAll<HTMLElement>("[data-spine-lane]")) {
        const hub = element.querySelector<HTMLElement>(".spine-hub");
        if (!hub || element.offsetParent === null) continue;
        const top = toWorld(offsetWithin(element, root).y), hubCenter = center(hub, root);
        lanes.push({ id: element.dataset.spineLane || String(lanes.length), x: hubCenter.x, top, bottom: top + element.offsetHeight, hubY: toWorld(hubCenter.y), width: element.offsetWidth, calm: element.dataset.spineCalm === "true", hub });
      }
      route = buildSpineRoute(lanes, { top: 0, bottom: height - 2 }, { mobile });
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height));
      trace.setAttribute("d", route ? routePathData(route) : "");
      root.dataset.spine = route ? "ready" : "pending";
      root.dataset.spineLayout = mobile ? "mobile" : "desktop";

      // One distribution point per section, including mobile and small item anchors.
      branches.replaceChildren();
      const groups = new Map<HTMLElement, BranchState[]>();
      for (const anchor of root.querySelectorAll<HTMLElement>("[data-spine-anchor]")) {
        if (anchor.offsetParent === null || !route) continue;
        const section = anchor.closest("[data-spine-section]");
        const lane = lanes.find(item => item.hub.closest("[data-spine-section]") === section);
        if (!lane) continue;
        const anchorCenter = center(anchor, root), to = { x: anchorCenter.x, y: toWorld(anchorCenter.y) }, tick = anchor.dataset.spineAnchor === "tick";
        const item = anchor.closest<HTMLElement>("[data-spine-item]");
        const d = branchPath({ x: lane.x, y: lane.hubY }, to, mobile);
        if (!d) continue;
        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("class", tick ? "spine-branch spine-branch--tick" : "spine-branch");
        group.setAttribute("data-hub", lane.id);
        if (item) group.setAttribute("data-sequential", "true");
        for (const kind of ["line", "pulse"]) {
          const path = document.createElementNS(SVG_NS, "path");
          path.setAttribute("d", d);
          path.setAttribute("pathLength", "1");
          path.setAttribute("class", `spine-branch-${kind}`);
          group.append(path);
        }
        if (item) for (const [kind, point, radius] of [["hub", { x: lane.x, y: lane.hubY }, 14], ["endpoint", to, 5]] as const) {
          const ring = document.createElementNS(SVG_NS, "circle");
          ring.setAttribute("class", `spine-call-${kind}`);
          ring.setAttribute("cx", String(point.x)); ring.setAttribute("cy", String(point.y));
          ring.setAttribute("r", String(radius));
          group.append(ring);
        }
        branches.append(group);
        groups.set(lane.hub, [...(groups.get(lane.hub) ?? []), { group, item, y: to.y, value: "" }]);
      }
      releases.clear();
      hubs = route ? route.hubs.map(hub => {
        const element = lanes.find(lane => lane.id === hub.id)!.hub;
        const section = element.closest<HTMLElement>("[data-spine-section]");
        const items = groups.get(element) ?? [];
        const next = route!.hubs[route!.hubs.indexOf(hub) + 1];
        const pin = section ? scenes.get(section) : undefined;
        const endY = pin?.enabled ? worldTop(pin.end) + window.innerHeight * .4 : section?.hasAttribute("data-spine-sequence")
          ? branchSequenceEnd(hub.y, items.map(item => item.y), next?.y ?? height) : hub.y;
        if (endY > hub.y) releases.set(hub.id, endY);
        return { element, section, u: hub.u, y: hub.y, endY, branches: items, arrived: false, reached: false, pin };
      }) : [];
      hubs.forEach(hub => { delete hub.element.dataset.arrived; if (hub.section) delete hub.section.dataset.arrived; });
      renderer?.setRoute(route, originY, mobile);
      svg.style.transform = ""; placeWorld();
      delete root.dataset.spineMeasuring;
      // Extra native scroll distance changes SSR hash coordinates. Align once after enhancement.
      if (!initialAnchorAligned) {
        initialAnchorAligned = true;
        const anchor = [...root.querySelectorAll<HTMLElement>("[data-spine-section][id]")].find(section => `#${section.id}` === window.location.hash);
        anchor?.scrollIntoView({ block: "start", behavior: "instant" });
      }
      coreU = -1;
      requestCore();
    };
    const scheduleMeasure = () => { if (!disposed && !measureFrame) measureFrame = requestAnimationFrame(measure); };

    const sceneStates = () => hubs.map(hub => hub.pin ? sceneState(window.scrollY, hub.pin) : null);
    // Outside a pin the SVG world scrolls natively with the page (offset = completed pin distance).
    // Inside a pin it is fixed to the viewport at the frozen world view: no per-scroll movement at all.
    const placeWorld = () => {
      const scroll = window.scrollY;
      const pinned = gaps.some(gap => scroll > gap.start && scroll < gap.start + gap.distance);
      const transform = pinned ? `translate3d(${rootLeft}px,${-worldTop(scroll)}px,0)` : `translate3d(0,${pinnedScroll(scroll)}px,0)`;
      if (pinned === frozen && svg.style.transform === transform) return;
      frozen = pinned;
      if (pinned) svg.dataset.frozen = "true"; else delete svg.dataset.frozen;
      svg.style.transform = transform;
    };

    // ---- Active white core: scroll → target u → eased follow → arrival per hub. ----
    const stepCore = (now: number) => {
      coreFrame = 0;
      if (disposed || !route || !hubs.length) return;
      placeWorld();
      const vh = window.innerHeight, viewTop = worldTop();
      const remaining = document.documentElement.scrollHeight - vh - window.scrollY;
      const focusY = coreFocusY(viewTop, vh, remaining);
      const states = sceneStates();
      const pinnedIndex = states.findIndex(state => state?.mode === "pinnedSequence");
      const activeHub = hubs[pinnedIndex];
      const nearby = hubs.findIndex(hub => hub.pin?.enabled && window.scrollY >= hub.pin.start - vh * .4 && window.scrollY <= hub.pin.end + vh * .4);
      const mode = pinnedIndex >= 0 ? "pinnedSequence" : states[nearby]?.mode ?? "traveling";
      root.dataset.sceneMode = mode;
      const target = activeHub ? activeHub.u : coreTarget(route.hubs, focusY, releases);
      const previousCoreU = coreU;
      const dt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
      lastTime = now;
      // Reduced motion parks the core on the nearest hub (no travel animation); first frame snaps.
      if (activeHub) coreU = activeHub.u;
      else if (reduced) coreU = nearestHubU(route.hubs, target);
      else coreU = coreU < 0 ? target : damp(coreU, target, 6, dt);
      const settled = reduced || Math.abs(coreU - target) * route.length < .25;
      if (settled) coreU = reduced ? coreU : target;
      const p = routePoint(route, coreU);
      core.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      hubs.forEach((hub, i) => {
        const arrival = hubArrival(hub.u, coreU, route!.length);
        arrivals[i] = arrival;
        // A fast scroll may skip a section; do not replay offscreen items, but never call before the core passes its hub.
        if (hasReachedHub(previousCoreU, coreU, hub.u, route!.length)) hub.reached = true;
        if (focusY < hub.y - 24 && coreU < hub.u) hub.reached = false;
        hub.branches.forEach((branch, index) => {
          if (!branch.item) { branch.group.setAttribute("data-active", String(arrival > .55)); return; }
          const local = states[i];
          const state = hub.pin ? hub.pin.enabled ? pinnedBranch(local?.progress ?? 0, hub.branches.length, index) : { branch: 1, item: 1 } : branchSequence(focusY, hub.y, hub.endY, hub.branches.length, index, hub.reached);
          const hubPulse = "hubPulse" in state ? Number(state.hubPulse) : 0;
          const endpointPulse = "endpointPulse" in state ? Number(state.endpointPulse) : 0;
          const value = `${state.branch.toFixed(3)}:${state.item.toFixed(3)}:${hubPulse.toFixed(3)}:${endpointPulse.toFixed(3)}`;
          if (branch.value === value) return;
          branch.value = value;
          branch.group.style.setProperty("--branch-call", state.branch.toFixed(3));
          branch.group.style.setProperty("--hub-pulse", hubPulse.toFixed(3));
          branch.group.style.setProperty("--endpoint-pulse", endpointPulse.toFixed(3));
          branch.group.setAttribute("data-active", String(state.branch > 0));
          branch.group.setAttribute("data-order", String(index));
          branch.item.style.setProperty("--item-call", state.item.toFixed(3));
          branch.item.dataset.branchActive = String(state.item > .5);
        });
        const arrived = arrival > .55;
        if (arrived === hub.arrived) return;
        hub.arrived = arrived;
        const value = arrived ? "true" : "false";
        hub.element.dataset.arrived = value;
        if (hub.section) hub.section.dataset.arrived = value;
      });
      arrivals.length = hubs.length;
      syncIndex(route.hubs);
      if (indexNav) {
        indexNav.style.setProperty("--local-progress", String(states[pinnedIndex]?.progress ?? 0));
        if (activeHub?.section) indexLinks.forEach(link => { if (link.hash === `#${activeHub.section!.id}`) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
        if (activeHub) indexCurrent = "";
      }
      renderer?.setFocus(coreU, arrivals);
      if (!settled && visible) coreFrame = requestAnimationFrame(stepCore);
      else lastTime = 0;
    };
    // The right-side chapter indicator follows the core, so both always name the same section.
    const indexNav = root.querySelector<HTMLElement>(".narrative-index");
    const indexLinks = indexNav ? [...indexNav.querySelectorAll<HTMLAnchorElement>("a[href^='#']")] : [];
    let indexCurrent = "";
    const syncIndex = (routeHubs: SpineRoute["hubs"]) => {
      if (!indexNav || indexLinks.length < 2) return;
      const ids = indexLinks.map(link => link.hash.slice(1));
      let i = 0;
      while (i + 1 < routeHubs.length - 1 && coreU >= routeHubs[i + 1].u) i++;
      const a = routeHubs[i], b = routeHubs[Math.min(i + 1, routeHubs.length - 1)];
      const f = b.u > a.u ? Math.min(1, Math.max(0, (coreU - a.u) / (b.u - a.u))) : 0;
      const ia = ids.indexOf(a.id), ib = ids.indexOf(b.id);
      if (ia < 0 || ib < 0) return;
      indexNav.style.setProperty("--index-progress", ((ia + (ib - ia) * f) / (ids.length - 1)).toFixed(4));
      const current = f < .5 ? a.id : b.id;
      if (current === indexCurrent) return;
      indexCurrent = current;
      indexLinks.forEach(link => { if (link.hash === `#${current}`) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
    };
    function requestCore() { if (!disposed && !coreFrame) coreFrame = requestAnimationFrame(stepCore); }

    const unsubscribe = subscribeNarrative(snapshot => {
      const changed = snapshot.reduced !== reduced;
      reduced = snapshot.reduced; visible = snapshot.visible;
      renderer?.setState({ reduced, visible });
      if (changed) root.dataset.spineMotion = reduced ? "reduced" : "full";
      if (changed) scheduleMeasure();
      requestCore();
    });

    // WebGL is an enhancement: three.js loads lazily; without WebGL2 the SVG trace and core stay.
    const probe = document.createElement("canvas").getContext("webgl2");
    if (!probe) host.dataset.webgl = "fallback";
    else {
      host.dataset.webgl = "pending";
      const tier = selectMotionQuality({ reducedMotion: false, viewportWidth: window.innerWidth, hardwareConcurrency: navigator.hardwareConcurrency });
      import("@/components/three/data-spine-renderer").then(module => {
        if (disposed) return;
        renderer = module.createSpineRenderer(host, tier);
        if (!renderer) { host.dataset.webgl = "fallback"; return; }
        renderer.setState({ reduced, visible });
        renderer.setRoute(route, originY, mobileQuery.matches);
        renderer.setView(worldTop);
        if (coreU >= 0) renderer.setFocus(coreU, arrivals);
      }).catch(() => { host.dataset.webgl = "fallback"; });
    }

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(root);
    root.querySelectorAll<HTMLElement>("[data-pin-scene]").forEach(scene => observer.observe(scene));
    if (header) observer.observe(header);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", requestCore, { passive: true });
    mobileQuery.addEventListener("change", scheduleMeasure);
    document.fonts?.ready.then(scheduleMeasure).catch(() => {});
    measure();

    return () => {
      disposed = true;
      cancelAnimationFrame(measureFrame); cancelAnimationFrame(coreFrame);
      observer.disconnect(); unsubscribe();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", requestCore);
      mobileQuery.removeEventListener("change", scheduleMeasure);
      hubs.forEach(hub => {
        delete hub.element.dataset.arrived;
        if (hub.section) delete hub.section.dataset.arrived;
        if (hub.section) { delete hub.section.dataset.pin; for (const name of ["--pin-height", "--pin-viewport", "--pin-top"]) hub.section.style.removeProperty(name); }
        hub.branches.forEach(({ item }) => { if (item) { item.style.removeProperty("--item-call"); delete item.dataset.branchActive; } });
      });
      delete root.dataset.spine; delete root.dataset.spineLayout; delete root.dataset.spineMotion;
      delete root.dataset.sceneMode;
      delete root.dataset.spineMeasuring;
      renderer?.dispose();
    };
  }, []);

  return <>
    <div ref={layerRef} className="spine-route" aria-hidden="true">
      <svg ref={svgRef} focusable="false">
        <path ref={traceRef} id="landing-spine-trace" className="spine-route-trace" />
        <g ref={branchesRef} className="spine-branches" />
        <g ref={coreRef} className="spine-core" transform="translate(-100 -100)"><circle className="spine-core-halo" r="15" /><circle className="spine-core-ring" r="7.5" /><circle className="spine-core-dot" r="3.6" /></g>
      </svg>
    </div>
    <div ref={canvasRef} className="spine-canvas" aria-hidden="true" />
  </>;
}
