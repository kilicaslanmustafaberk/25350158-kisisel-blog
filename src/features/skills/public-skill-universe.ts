export type PublicSkillUniverseNode = {
  id: string;
  slug: string;
  name: string;
  category: string;
  publicProjectCount: number;
};

type VisibleSkill = Omit<PublicSkillUniverseNode, "publicProjectCount">;

export function buildPublicSkillUniverse(visibleSkills: VisibleSkill[], publicRelations: Array<{ skillId: string }>): PublicSkillUniverseNode[] {
  const countBySkill = new Map<string, number>();
  for (const row of publicRelations) countBySkill.set(row.skillId, (countBySkill.get(row.skillId) ?? 0) + 1);
  return visibleSkills.map((skill) => ({ ...skill, publicProjectCount: countBySkill.get(skill.id) ?? 0 }));
}
