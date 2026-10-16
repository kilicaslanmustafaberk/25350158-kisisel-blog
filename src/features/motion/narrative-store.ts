import { narrativeFrame } from "./narrative";

export type NarrativeSnapshot = ReturnType<typeof narrativeFrame> & { reduced: boolean; mobile: boolean; progress: number; activeProgress: number; visible: boolean };
const initial: NarrativeSnapshot = { from: "hero", to: "hero", blend: 0, active: "hero", reduced: false, mobile: false, progress: 0, activeProgress: 0, visible: true };
let current = initial;
const listeners = new Set<(snapshot: NarrativeSnapshot) => void>();
export function publishNarrative(snapshot: NarrativeSnapshot) { current = snapshot; listeners.forEach(listener => listener(snapshot)); }
export function subscribeNarrative(listener: (snapshot: NarrativeSnapshot) => void) { listeners.add(listener); listener(current); return () => { listeners.delete(listener); }; }
export function resetNarrative() { current = initial; }
