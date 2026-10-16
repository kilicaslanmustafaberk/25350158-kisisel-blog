"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { clampPixelRatio, isOverlayOpen, selectMotionQuality } from "@/features/motion/quality";
import type { PublicSkillUniverseNode } from "@/features/skills/public-skill-universe";
import { damp, lerp, SKILL_AXIS_LEAN, skillEmergence } from "@/features/motion/data-spine";
import { clamp01, smoothProgress } from "@/features/motion/narrative";
import { subscribeNarrative } from "@/features/motion/narrative-store";

/** Where each skill node starts: on a near-vertical axis, continuing the page-wide spine. */
function spinePosition(index: number, count: number) {
  const t = count > 1 ? index / (count - 1) - .5 : 0, lean = SKILL_AXIS_LEAN;
  return new THREE.Vector3(Math.sin(lean) * t * 3.4, Math.cos(lean) * t * 3.4, Math.sin(t * Math.PI) * .2);
}

function nodePosition(index: number, count: number) {
  const angle = index * 2.399963229728653;
  const radius = 0.6 + (index % 5) * 0.27 + Math.min(count, 30) * 0.01;
  return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72, ((index % 4) - 1.5) * 0.22);
}

export function SkillUniverseScene({ skills, selectedId }: { skills: PublicSkillUniverseNode[]; selectedId: string | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedId);
  const requestRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    selectedRef.current = selectedId;
    requestRef.current?.();
  }, [selectedId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !skills.length) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2")) return;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    const quality = selectMotionQuality({ reducedMotion, viewportWidth: window.innerWidth, hardwareConcurrency: navigator.hardwareConcurrency });
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: quality === "desktop", powerPreference: "high-performance" });
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Skill Universe WebGL başlatılamadı.", error);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(clampPixelRatio(window.devicePixelRatio, quality));
    renderer.domElement.className = "three-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    camera.position.z = 5.2;
    const group = new THREE.Group();
    scene.add(group);
    const visibleSkills = skills.slice(0, quality === "mobile" ? 24 : quality === "tablet" ? 40 : 64);
    const positions = visibleSkills.map((_, index) => nodePosition(index, visibleSkills.length));
    const origins = visibleSkills.map((_, index) => spinePosition(index, visibleSkills.length));
    const current = positions.map(position => position.clone());
    const pointArray = new Float32Array(positions.length * 3);
    const pointGeometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pointArray, 3).setUsage(THREE.DynamicDrawUsage));
    pointGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    const pointMaterial = new THREE.PointsMaterial({ color: 0xa7f3d0, size: quality === "mobile" ? 0.105 : 0.08, transparent: true, opacity: 0.85, sizeAttenuation: true });
    group.add(new THREE.Points(pointGeometry, pointMaterial));

    const edgePairs: number[] = [];
    for (let index = 1; index < visibleSkills.length; index += 1) edgePairs.push(Math.max(0, index - (index % 3 === 0 ? 3 : 1)), index);
    const edgeArray = new Float32Array(edgePairs.length * 3);
    const edgeGeometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(edgeArray, 3).setUsage(THREE.DynamicDrawUsage));
    edgeGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    let emergence = 1, emergenceTarget = 1, lastTimestamp = 0;
    // Staggered along the axis: nodes leave the spine one after another, not all at once.
    const layout = (amount: number) => {
      current.forEach((point, index) => {
        const local = smoothProgress(clamp01(amount * 1.45 - (index / Math.max(1, current.length)) * .45));
        point.set(lerp(origins[index].x, positions[index].x, local), lerp(origins[index].y, positions[index].y, local), lerp(origins[index].z, positions[index].z, local));
        point.toArray(pointArray, index * 3);
      });
      edgePairs.forEach((vertex, index) => current[vertex].toArray(edgeArray, index * 3));
      pointGeometry.attributes.position.needsUpdate = true; edgeGeometry.attributes.position.needsUpdate = true;
      edgeMaterial.opacity = .08 + .17 * amount;
    };
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x5fbfa4, transparent: true, opacity: 0.25 });
    group.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));

    const selectedGeometry = new THREE.RingGeometry(0.12, 0.16, 24);
    const selectedMaterial = new THREE.MeshBasicMaterial({ color: 0xf1f3f4, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(selectedGeometry, selectedMaterial);
    group.add(marker);

    let frame = 0;
    let visible = true;
    const startedAt = performance.now();
    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };
    const render = (timestamp: number) => {
      frame = 0;
      if (!visible || document.hidden || isOverlayOpen()) return;
      const selectedIndex = visibleSkills.findIndex((skill) => skill.id === selectedRef.current);
      marker.visible = selectedIndex >= 0;
      const dt = lastTimestamp ? Math.min(.1, (timestamp - lastTimestamp) / 1000) : 1 / 60;
      lastTimestamp = timestamp;
      emergence = reducedMotion ? emergenceTarget : damp(emergence, emergenceTarget, 6, dt);
      layout(emergence);
      if (selectedIndex >= 0) marker.position.copy(current[selectedIndex]);
      group.rotation.z = reducedMotion ? 0 : Math.sin(((timestamp - startedAt) / 1000) * 0.16) * 0.035;
      renderer.render(scene, camera);
      if (!reducedMotion) frame = requestAnimationFrame(render); else lastTimestamp = 0;
    };
    const requestRender = () => { if (!frame && visible && !document.hidden && !isOverlayOpen()) frame = requestAnimationFrame(render); };
    requestRef.current = requestRender;
    const unsubscribe = subscribeNarrative(snapshot => {
      reducedMotion = snapshot.reduced || motionPreference.matches;
      emergenceTarget = reducedMotion ? 1 : skillEmergence(snapshot);
      requestRender();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && frame) cancelAnimationFrame(frame);
      frame = 0;
      requestRender();
    }, { rootMargin: "120px" });
    const resizeObserver = new ResizeObserver(() => { resize(); requestRender(); });
    const visibilityChange = () => requestRender();
    intersection.observe(host);
    resizeObserver.observe(host);
    document.addEventListener("visibilitychange", visibilityChange);
    window.addEventListener("site-overlay-change", visibilityChange);
    resize();
    requestRender();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      unsubscribe(); requestRef.current = null;
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      window.removeEventListener("site-overlay-change", visibilityChange);
      pointGeometry.dispose();
      edgeGeometry.dispose();
      selectedGeometry.dispose();
      pointMaterial.dispose();
      edgeMaterial.dispose();
      selectedMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [skills]);

  return <div ref={hostRef} className="three-host" />;
}
