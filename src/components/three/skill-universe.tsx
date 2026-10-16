"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import type { PublicSkillUniverseNode } from "@/features/skills/public-skill-universe";

const SkillUniverseScene = dynamic(() => import("./skill-universe-scene").then((module) => module.SkillUniverseScene), { ssr: false });

export function SkillUniverse({ skills }: { skills: PublicSkillUniverseNode[] }) {
  const [selectedId, setSelectedId] = useState(skills[0]?.id ?? null);
  const selected = skills.find((skill) => skill.id === selectedId) ?? skills[0];

  return <div className="skill-universe-shell">
    <div className="skill-universe-visual" aria-hidden="true">
      <div className="skill-universe-fallback" />
      <SkillUniverseScene skills={skills} selectedId={selectedId} />
      {selected && <div className="skill-readout">
        <strong>{selected.name}</strong>
        <span>{selected.publicProjectCount} {selected.publicProjectCount === 1 ? "proje" : "proje"}</span>
        <small>{selected.category}</small>
      </div>}
    </div>
    <ul className="skill-accessible-list" aria-label="Görünür yetenekler">
      {skills.map((skill) => <li key={skill.id}>
        <button
          type="button"
          aria-pressed={selectedId === skill.id}
          onClick={() => setSelectedId(skill.id)}
          onFocus={() => setSelectedId(skill.id)}
          onPointerEnter={() => setSelectedId(skill.id)}
        >
          <span>{skill.name}</span>
          <small>{skill.category} · {skill.publicProjectCount} proje</small>
        </button>
      </li>)}
    </ul>
  </div>;
}
