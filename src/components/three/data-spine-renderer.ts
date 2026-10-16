import * as THREE from "three";

import { MAX_HUBS, revealHead, ROUTE_SAMPLES, seededRandom, spineQuality, type SpineRoute } from "@/features/motion/data-spine";
import { clampPixelRatio, isOverlayOpen, type MotionQuality } from "@/features/motion/quality";

/**
 * Phase 14 renderer: ONE fixed-viewport WebGL canvas drawing ONE page-long
 * route. The route (2048 samples) lives in a float texture; every vertex
 * computes its position from that texture in the shader. Scrolling only moves
 * the view window (uView) over the same geometry — nothing is re-posed per
 * section. Layout changes re-upload the texture; topology is built once.
 */

const shared = /* glsl */ `
uniform sampler2D uRoute;
uniform float uCount;
uniform float uLength;
uniform vec4 uView;
uniform float uTime;
uniform float uFlow;
uniform float uHead;
uniform float uOpacity;
uniform float uPixelRatio;
uniform float uBaseRadius;
uniform float uBulge;
uniform float uHubU[${MAX_HUBS}];
uniform float uHubActive[${MAX_HUBS}];
uniform vec2 uHubPos[${MAX_HUBS}];
uniform int uHubCount;
uniform float uCoreU;

vec4 routeAt(float u) {
  float f = clamp(u, 0.0, 1.0) * (uCount - 1.0);
  float i = floor(f);
  vec4 a = texelFetch(uRoute, ivec2(int(i), 0), 0);
  vec4 b = texelFetch(uRoute, ivec2(int(min(i + 1.0, uCount - 1.0)), 0), 0);
  return mix(a, b, f - i);
}
vec2 routeTangent(float u) {
  float d = 3.0 / (uCount - 1.0);
  vec2 t = routeAt(u + d).xy - routeAt(u - d).xy;
  float l = length(t);
  return l > 1e-4 ? t / l : vec2(0.0, 1.0);
}
// Gaussian "energy" around hubs (in px of arc length) and how act those hubs are.
float hubField(float u, out float act) {
  float field = 0.0;
  act = 0.0;
  for (int i = 0; i < ${MAX_HUBS}; i++) {
    if (i >= uHubCount) break;
    float d = (u - uHubU[i]) * uLength;
    float g = exp(-d * d / 45000.0);
    field += g;
    act += g * uHubActive[i];
  }
  return min(field, 1.0);
}
// Helix offset of one wire around the route; depth (0 back .. 1 front) shades it.
vec2 strandPoint(float u, float strand, out float depth, out float field, out float act) {
  vec4 r = routeAt(u);
  field = hubField(u, act);
  if (strand < 0.0) { depth = 1.0; return r.xy; }
  vec2 t = routeTangent(u);
  vec2 n = vec2(-t.y, t.x);
  float s = u * uLength;
  float phase = strand * 2.39996 + s * (0.0085 + 0.0025 * mod(strand, 3.0)) + uTime * 0.32 * uFlow;
  float radius = r.z * (uBaseRadius * (1.0 + 0.3 * sin(s * 0.0031 + strand * 1.7 + uTime * 0.18)) + uBulge * field);
  depth = 0.5 + 0.5 * cos(phase);
  return r.xy + n * sin(phase) * radius;
}
// Satellites: a loose network cloud that widens and brightens around hubs.
vec2 satellitePoint(float u, vec2 offset, out float field, out float act) {
  vec4 r = routeAt(u);
  field = hubField(u, act);
  vec2 t = routeTangent(u);
  vec2 n = vec2(-t.y, t.x);
  float seed = fract(u * 7919.0);
  vec2 drift = vec2(sin(uTime * 0.23 + seed * 6.283), cos(uTime * 0.19 + seed * 4.1)) * 4.0;
  return r.xy + n * offset.x * r.z * (0.45 + 0.9 * field) + t * offset.y + drift;
}
vec4 toClip(vec2 p) {
  return vec4((p.x - uView.x) / uView.z * 2.0 - 1.0, 1.0 - (p.y - uView.y) / uView.w * 2.0, 0.0, 1.0);
}
float reveal(float y) { return mix(0.42, 1.0, smoothstep(uHead + 240.0, uHead - 40.0, y)); }
// Light trail around the travelling white core (Phase 15).
float coreGlow(float u) { float d = (u - uCoreU) * uLength; return exp(-d * d / 16200.0); }
float ends(float u) { return smoothstep(0.0, 0.02, u) * smoothstep(1.0, 0.985, u); }
`;

const lineVertex = /* glsl */ `
${shared}
attribute float aU;
attribute float aStrand;
attribute float aKind;
attribute vec2 aOffset;
attribute vec3 aPartner;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float depth, field, act;
  vec2 p;
  float alpha;
  if (aKind < 2.5) {
    p = strandPoint(aU, aKind < 0.5 ? -1.0 : aStrand, depth, field, act);
    if (aKind < 0.5) { vColor = vec3(0.84, 1.0, 0.93); alpha = 0.5 + 0.35 * act; }
    else if (aKind < 1.5) { vColor = vec3(0.49, 0.89, 0.72); alpha = (0.1 + 0.2 * depth) * (0.7 + 0.9 * field) + 0.2 * act; }
    else { vColor = vec3(0.24, 0.6, 0.48); alpha = (0.05 + 0.08 * field) * (0.5 + depth) + 0.08 * act; }
  } else {
    p = satellitePoint(aU, aOffset, field, act);
    float f2, a2;
    vec2 q = satellitePoint(aPartner.x, aPartner.yz, f2, a2);
    vColor = vec3(0.3, 0.72, 0.58);
    alpha = (0.05 + 0.12 * field + 0.1 * act) * smoothstep(260.0, 70.0, distance(p, q));
  }
  vAlpha = (alpha + 0.3 * coreGlow(aU) * step(aKind, 1.5)) * reveal(p.y) * ends(aU) * uOpacity;
  gl_Position = toClip(p);
}`;

const ringVertex = /* glsl */ `
${shared}
attribute float aHub;
attribute float aAngle;
attribute vec4 aRing;
varying vec3 vColor;
varying float vAlpha;
void main() {
  int h = int(aHub);
  if (h >= uHubCount) { vAlpha = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
  float act = uHubActive[h];
  float spin = aRing.z + uTime * aRing.w * uFlow;
  float a = aAngle;
  vec2 e = vec2(cos(a) * aRing.x, sin(a) * aRing.y) * (0.92 + 0.12 * act);
  vec2 p = uHubPos[h] + vec2(e.x * cos(spin) - e.y * sin(spin), e.x * sin(spin) + e.y * cos(spin));
  vColor = vec3(0.6, 0.93, 0.78);
  // Front half of the tilted orbit is brighter: a cheap depth cue.
  vAlpha = (0.08 + 0.3 * act) * (0.45 + 0.55 * (0.5 + 0.5 * sin(a))) * reveal(p.y) * uOpacity;
  gl_Position = toClip(p);
}`;

const lineFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  if (vAlpha < 0.003) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}`;

const pointVertex = /* glsl */ `
${shared}
attribute float aU;
attribute float aStrand;
attribute float aKind;
attribute vec2 aOffset;
attribute float aSize;
attribute float aSeed;
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;
void main() {
  float depth = 1.0, field = 0.0, act = 0.0;
  vec2 p;
  float alpha, size = aSize;
  vSoft = 0.0;
  if (aKind < 0.5) {
    p = strandPoint(aU, aStrand, depth, field, act);
    vColor = vec3(0.84, 1.0, 0.93);
    alpha = (0.25 + 0.45 * depth) * (0.6 + 0.6 * field) + 0.25 * act;
  } else if (aKind < 1.5) {
    p = satellitePoint(aU, aOffset, field, act);
    vColor = vec3(0.62, 0.95, 0.8);
    alpha = 0.18 + 0.35 * field + 0.35 * act;
    size *= 0.8 + 0.5 * field;
  } else if (aKind < 2.5) {
    // Signal: flows down the spine, top to bottom, at 16-48 px/s.
    float u = fract(aU + uTime * uFlow * (16.0 + 32.0 * aSeed) / max(uLength, 1.0));
    p = strandPoint(u, aStrand, depth, field, act);
    vColor = vec3(0.8, 1.0, 0.9);
    alpha = (0.45 + 0.5 * depth) * ends(u);
  } else if (aKind > 4.5) {
    // The active white core and its halo ride the route at uCoreU.
    p = routeAt(uCoreU).xy;
    if (aKind < 5.5) { vColor = vec3(0.94, 1.0, 0.97); alpha = 0.95; }
    else { vColor = vec3(0.4, 0.9, 0.7); alpha = 0.26; vSoft = 1.0; }
    field = 1.0;
  } else {
    int h = int(aStrand);
    if (h >= uHubCount) { vAlpha = 0.0; gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); return; }
    act = uHubActive[h];
    p = uHubPos[h];
    if (aKind < 3.5) { vColor = mix(vec3(0.5, 0.86, 0.7), vec3(0.9, 1.0, 0.95), act); alpha = 0.3 + 0.6 * act; size *= 0.75 + 0.45 * act; }
    else { vColor = vec3(0.35, 0.86, 0.64); alpha = 0.1 + 0.2 * act; size *= 0.8 + 0.5 * act; vSoft = 1.0; }
    field = 1.0;
  }
  vAlpha = alpha * reveal(p.y) * (aKind > 2.5 ? 1.0 : ends(aU)) * uOpacity;
  gl_PointSize = size * uPixelRatio;
  gl_Position = toClip(p);
}`;

const pointFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vSoft;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float core = smoothstep(0.22, 0.0, d) + smoothstep(0.5, 0.0, d) * 0.35;
  float halo = pow(smoothstep(0.5, 0.0, d), 2.2);
  float a = mix(core, halo, vSoft) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, a);
}`;

export type SpineRenderer = {
  setRoute(route: SpineRoute | null, originY: number, mobile: boolean): void;
  setState(state: { reduced: boolean; visible: boolean }): void;
  /** Active white core position (route u) and per-hub arrival 0..1, owned by the DOM layer. */
  setFocus(coreU: number, arrivals: readonly number[]): void;
  /** World view top for the current scroll (pinned scenes hold it constant); defaults to page scroll. */
  setView(view: (() => number) | null): void;
  dispose(): void;
};

/** Builds the renderer or returns null (caller keeps the SVG trace as fallback). */
export function createSpineRenderer(host: HTMLElement, tier: MotionQuality): SpineRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: tier === "desktop", powerPreference: "low-power" }); }
  catch { return null; }
  if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return null; }
  const budget = spineQuality[tier];
  renderer.setClearColor(0x000000, 0);
  // A shader that fails to compile must not leave a blank layer: fall back to the SVG trace.
  let shaderFailed = false;
  renderer.debug.onShaderError = () => { shaderFailed = true; host.dataset.webgl = "fallback"; };
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const routeData = new Float32Array(ROUTE_SAMPLES * 4);
  const routeTexture = new THREE.DataTexture(routeData, ROUTE_SAMPLES, 1, THREE.RGBAFormat, THREE.FloatType);
  routeTexture.minFilter = routeTexture.magFilter = THREE.NearestFilter;
  routeTexture.generateMipmaps = false;
  const uniforms = {
    uRoute: { value: routeTexture }, uCount: { value: ROUTE_SAMPLES }, uLength: { value: 1 },
    uView: { value: new THREE.Vector4(0, 0, 1, 1) }, uTime: { value: 0 }, uFlow: { value: 1 }, uHead: { value: 1e9 },
    uOpacity: { value: 0 }, uPixelRatio: { value: 1 }, uBaseRadius: { value: tier === "mobile" ? 5 : 9 }, uBulge: { value: tier === "mobile" ? 12 : 30 },
    uHubU: { value: new Array<number>(MAX_HUBS).fill(0) }, uHubActive: { value: new Array<number>(MAX_HUBS).fill(0) },
    uHubPos: { value: Array.from({ length: MAX_HUBS }, () => new THREE.Vector2()) }, uHubCount: { value: 0 }, uCoreU: { value: 0 },
  };
  const material = (vertexShader: string, fragmentShader: string) => new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const random = seededRandom(1407);

  // ---- Lines: core axis, helix strands, cross web, satellite links. One draw call. ----
  const K = budget.strands, M = budget.strandSegments, S = budget.satellites;
  const satU = Array.from({ length: S }, () => random()).sort((a, b) => a - b);
  const satOffset = satU.map(() => [(random() < .5 ? -1 : 1) * (26 + random() ** 1.6 * 150), (random() - .5) * 40] as const);
  const line: { u: number[]; strand: number[]; kind: number[]; offset: number[]; partner: number[] } = { u: [], strand: [], kind: [], offset: [], partner: [] };
  const vertex = (u: number, strand: number, kind: number, ox = 0, oy = 0, pu = u, px = ox, py = oy) => {
    line.u.push(u); line.strand.push(strand); line.kind.push(kind); line.offset.push(ox, oy); line.partner.push(pu, px, py);
  };
  const coreSegments = Math.round(M * .8);
  for (let m = 0; m < coreSegments; m++) { vertex(m / coreSegments, -1, 0); vertex((m + 1) / coreSegments, -1, 0); }
  for (let k = 0; k < K; k++) for (let m = 0; m < M; m++) { vertex(m / M, k, 1); vertex((m + 1) / M, k, 1); }
  const webEvery = Math.max(6, Math.round(M / 160));
  for (let m = 0; m < M; m += webEvery) for (let k = 0; k < K; k++) {
    const u = m / M, next = Math.min(1, u + webEvery * .5 / M);
    vertex(u, k, 2); vertex(next, (k + 1) % K, 2);
  }
  for (let i = 0; i < Math.min(budget.links, S - 1); i++) {
    const a = Math.floor(i * (S - 1) / budget.links), b = a + 1 + (i % 3 === 0 && a + 2 < S ? 1 : 0);
    vertex(satU[a], 0, 3, satOffset[a][0], satOffset[a][1], satU[b], satOffset[b][0], satOffset[b][1]);
    vertex(satU[b], 0, 3, satOffset[b][0], satOffset[b][1], satU[a], satOffset[a][0], satOffset[a][1]);
  }
  const lineGeometry = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(line.u.length * 3), 3))
    .setAttribute("aU", new THREE.Float32BufferAttribute(line.u, 1))
    .setAttribute("aStrand", new THREE.Float32BufferAttribute(line.strand, 1))
    .setAttribute("aKind", new THREE.Float32BufferAttribute(line.kind, 1))
    .setAttribute("aOffset", new THREE.Float32BufferAttribute(line.offset, 2))
    .setAttribute("aPartner", new THREE.Float32BufferAttribute(line.partner, 3));
  const lineMaterial = material(lineVertex, lineFragment);

  // ---- Orbit rings around every hub slot (unused slots collapse in the shader). ----
  const R = budget.rings, G = budget.ringSegments;
  const ring: { hub: number[]; angle: number[]; params: number[] } = { hub: [], angle: [], params: [] };
  for (let h = 0; h < MAX_HUBS; h++) for (let r = 0; r < R; r++) {
    const rx = (tier === "mobile" ? 16 : 26) + r * (tier === "mobile" ? 9 : 17) + random() * 6, ry = rx * (.28 + random() * .3);
    const tilt = -.5 + random(), speed = (r % 2 ? -1 : 1) * (.05 + random() * .06);
    const sweep = r % 2 ? Math.PI * 1.55 : Math.PI * 2;
    for (let g = 0; g < G; g++) for (const step of [g, g + 1]) {
      ring.hub.push(h); ring.angle.push(sweep * step / G + r * 1.3); ring.params.push(rx, ry, tilt, speed);
    }
  }
  const ringGeometry = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(ring.hub.length * 3), 3))
    .setAttribute("aHub", new THREE.Float32BufferAttribute(ring.hub, 1))
    .setAttribute("aAngle", new THREE.Float32BufferAttribute(ring.angle, 1))
    .setAttribute("aRing", new THREE.Float32BufferAttribute(ring.params, 4));
  const ringMaterial = material(ringVertex, lineFragment);

  // ---- Points: strand nodes, satellites, flowing signals, hub cores + halos. ----
  const point: { u: number[]; strand: number[]; kind: number[]; offset: number[]; size: number[]; seed: number[] } = { u: [], strand: [], kind: [], offset: [], size: [], seed: [] };
  const dot = (u: number, strand: number, kind: number, size: number, ox = 0, oy = 0, seed = 0) => {
    point.u.push(u); point.strand.push(strand); point.kind.push(kind); point.offset.push(ox, oy); point.size.push(size); point.seed.push(seed);
  };
  const nodes = Math.round(M / 9);
  for (let i = 0; i < nodes; i++) dot(random(), Math.floor(random() * K), 0, 2.4 + random() * 2.6);
  satU.forEach((u, i) => dot(u, 0, 1, 1.6 + random() * 2.2, satOffset[i][0], satOffset[i][1]));
  for (let q = 0; q < budget.particles; q++) dot(random(), random() < .45 ? -1 : Math.floor(random() * K), 2, 2.6 + random() * 2.4, 0, 0, random());
  for (let h = 0; h < MAX_HUBS; h++) { dot(0, h, 4, tier === "mobile" ? 70 : 150); dot(0, h, 3, tier === "mobile" ? 14 : 22); }
  dot(0, 0, 6, tier === "mobile" ? 64 : 120); dot(0, 0, 5, tier === "mobile" ? 11 : 16);
  const pointGeometry = new THREE.BufferGeometry()
    .setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(point.u.length * 3), 3))
    .setAttribute("aU", new THREE.Float32BufferAttribute(point.u, 1))
    .setAttribute("aStrand", new THREE.Float32BufferAttribute(point.strand, 1))
    .setAttribute("aKind", new THREE.Float32BufferAttribute(point.kind, 1))
    .setAttribute("aOffset", new THREE.Float32BufferAttribute(point.offset, 2))
    .setAttribute("aSize", new THREE.Float32BufferAttribute(point.size, 1))
    .setAttribute("aSeed", new THREE.Float32BufferAttribute(point.seed, 1));
  const pointMaterial = material(pointVertex, pointFragment);

  const objects = [new THREE.LineSegments(lineGeometry, lineMaterial), new THREE.LineSegments(ringGeometry, ringMaterial), new THREE.Points(pointGeometry, pointMaterial)];
  // Positions come from the shader; the placeholder bounding sphere must not cull anything.
  for (const object of objects) { object.frustumCulled = false; scene.add(object); }
  host.dataset.vertices = String(line.u.length + ring.hub.length + point.u.length);

  // ---- State & loop ----
  let view: (() => number) | null = null;
  let route: SpineRoute | null = null, originY = 0, reduced = false, visible = true, contextLost = false;
  let width = 0, height = 0, pixelRatio = 0, frame = 0, last = 0, time = 0, renders = 0, lastScroll = -1, lastInput = performance.now();
  const hubActive = uniforms.uHubActive.value;
  const canDraw = () => !shaderFailed && Boolean(route) && visible && !document.hidden && !isOverlayOpen() && !contextLost;
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    const ratio = clampPixelRatio(window.devicePixelRatio, reduced ? "static" : tier);
    if (w === width && h === height && ratio === pixelRatio) return;
    width = w; height = h; pixelRatio = ratio;
    renderer.setPixelRatio(ratio); renderer.setSize(w, h, false);
    uniforms.uPixelRatio.value = ratio;
  };
  const draw = () => {
    if (!route) return;
    resize();
    const viewTop = view ? view() : window.scrollY - originY;
    uniforms.uView.value.set(0, viewTop, Math.max(1, width), Math.max(1, height));
    uniforms.uHead.value = Math.min(revealHead(viewTop, height, reduced), 1e9);
    uniforms.uTime.value = time;
    renderer.render(scene, camera);
    host.dataset.renders = String(++renders);
    host.dataset.drawCalls = String(renderer.info.render.calls);
  };
  const loop = (now: number) => {
    frame = 0;
    if (!canDraw()) { last = 0; return; }
    const scroll = window.scrollY;
    if (scroll !== lastScroll) { lastScroll = scroll; lastInput = now; }
    if (reduced) { draw(); last = 0; return; }
    // 60 fps while scrolling; 30 fps when idle or on mobile. The first frame after a (re)start always draws.
    const minimum = budget.fps === 30 || now - lastInput > 3000 ? 1 / 31 : 0;
    const dt = last ? (now - last) / 1000 : 1 / 60;
    if (!last || dt >= minimum) { last = now; time += Math.min(dt, .1); draw(); }
    frame = requestAnimationFrame(loop);
  };
  const request = () => { if (!frame && canDraw()) frame = requestAnimationFrame(loop); };
  const stop = () => { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; };
  const onScroll = () => { lastInput = performance.now(); request(); };
  const visibility = () => { if (document.hidden) stop(); else request(); };
  const lost = (event: Event) => { event.preventDefault(); contextLost = true; host.dataset.webgl = "fallback"; stop(); };
  const restored = () => { contextLost = false; host.dataset.webgl = "ready"; pixelRatio = 0; request(); };
  const observer = new ResizeObserver(() => { width = 0; request(); });
  observer.observe(host);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("site-overlay-change", request);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  renderer.domElement.addEventListener("webglcontextrestored", restored);

  return {
    setRoute(next, origin, mobile) {
      route = next; originY = origin;
      if (!next) { stop(); host.dataset.webgl = "fallback"; return; }
      routeData.fill(0); routeData.set(next.samples.subarray(0, ROUTE_SAMPLES * 4));
      routeTexture.needsUpdate = true;
      uniforms.uCount.value = Math.min(next.count, ROUTE_SAMPLES);
      uniforms.uLength.value = next.length;
      uniforms.uHubCount.value = next.hubs.length;
      next.hubs.forEach((hub, i) => { uniforms.uHubU.value[i] = hub.u; uniforms.uHubPos.value[i].set(hub.x, hub.y); });
      uniforms.uOpacity.value = mobile ? .72 : 1;
      uniforms.uBaseRadius.value = mobile ? 4 : tier === "tablet" ? 7 : 9;
      uniforms.uBulge.value = mobile ? 10 : tier === "tablet" ? 22 : 30;
      host.dataset.webgl = "ready"; host.dataset.quality = tier; host.dataset.hubs = String(next.hubs.length);
      host.dataset.hubY = next.hubs.map(hub => Math.round(hub.y)).join(",");
      request();
    },
    setView(next) { view = next; request(); },
    setFocus(coreU, arrivals) {
      uniforms.uCoreU.value = coreU;
      for (let i = 0; i < MAX_HUBS; i++) hubActive[i] = arrivals[i] ?? 0;
      if (reduced) request();
    },
    setState(state) {
      reduced = state.reduced; visible = state.visible;
      uniforms.uFlow.value = reduced ? 0 : 1;
      pixelRatio = 0;
      if (!visible) stop(); else request();
    },
    dispose() {
      stop(); observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("site-overlay-change", request);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      renderer.domElement.removeEventListener("webglcontextrestored", restored);
      for (const geometry of [lineGeometry, ringGeometry, pointGeometry]) geometry.dispose();
      for (const mat of [lineMaterial, ringMaterial, pointMaterial]) mat.dispose();
      routeTexture.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
