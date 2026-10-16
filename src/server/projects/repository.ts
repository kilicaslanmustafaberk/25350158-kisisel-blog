import "server-only";

import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { media, projectImages, projects, projectSkills, skills } from "@/db/schema";
import type { ProjectInput } from "@/features/projects/validation";
import { buildPublicSkillUniverse, type PublicSkillUniverseNode } from "@/features/skills/public-skill-universe";

async function database() {
  return (await import("@/db")).db;
}

function projectValues(input: ProjectInput) {
  return {
    title: input.title,
    slug: input.slug,
    shortDescription: input.shortDescription,
    detailedDescription: input.detailedDescription,
    problem: input.problem,
    solution: input.solution,
    role: input.role,
    architectureDescription: input.architectureDescription,
    status: input.status,
    projectDate: input.projectDate,
    liveUrl: input.liveUrl,
    repositoryVisibility: input.repositoryVisibility,
    repositoryUrl: input.repositoryVisibility === "none" ? null : input.repositoryUrl,
    featured: input.featured,
    published: input.published,
    includeInCv: input.includeInCv,
    updatedAt: new Date(),
  };
}

export async function validateSkillIds(skillIds: string[]) {
  const db = await database();
  if (!skillIds.length) return true;
  const rows = await db.select({ id: skills.id }).from(skills).where(inArray(skills.id, skillIds));
  return rows.length === skillIds.length;
}

export async function slugExists(slug: string, exceptId?: string) {
  const db = await database();
  const where = exceptId
    ? and(eq(projects.slug, slug), ne(projects.id, exceptId))
    : eq(projects.slug, slug);
  const row = await db.select({ id: projects.id }).from(projects).where(where).limit(1);
  return row.length > 0;
}

export async function createProject(input: ProjectInput) {
  const db = await database();
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(projects).values({ id, ...projectValues(input), createdAt: new Date() });
    if (input.skillIds.length) {
      await tx.insert(projectSkills).values(input.skillIds.map((skillId, displayOrder) => ({ projectId: id, skillId, displayOrder })));
    }
  });
  return id;
}

export async function updateProject(id: string, input: ProjectInput) {
  const db = await database();
  await db.transaction(async (tx) => {
    const updated = await tx.update(projects).set(projectValues(input)).where(eq(projects.id, id)).returning({ id: projects.id });
    if (!updated.length) throw new Error("PROJECT_NOT_FOUND");
    await tx.delete(projectSkills).where(eq(projectSkills.projectId, id));
    if (input.skillIds.length) {
      await tx.insert(projectSkills).values(input.skillIds.map((skillId, displayOrder) => ({ projectId: id, skillId, displayOrder })));
    }
  });
}

export async function updateProjectState(id: string, field: "published" | "featured" | "includeInCv", value: boolean) {
  const db = await database();
  const updated = await db.update(projects).set({ [field]: value, updatedAt: new Date() }).where(eq(projects.id, id)).returning({ slug: projects.slug });
  return updated[0] ?? null;
}

export async function deleteProject(id: string) {
  const db = await database();
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning({ slug: projects.slug });
  return deleted[0] ?? null;
}

export async function projectExists(id: string) {
  const db = await database();
  return (await db.select({ id: projects.id }).from(projects).where(eq(projects.id, id)).limit(1)).length > 0;
}

export async function listSkills() {
  const db = await database();
  return db.select({ id: skills.id, name: skills.name, category: skills.category }).from(skills).orderBy(asc(skills.category), asc(skills.displayOrder), asc(skills.name));
}

export async function listAdminProjects() {
  const db = await database();
  return db.select({
    id: projects.id,
    title: projects.title,
    slug: projects.slug,
    status: projects.status,
    published: projects.published,
    featured: projects.featured,
    includeInCv: projects.includeInCv,
    updatedAt: projects.updatedAt,
  }).from(projects).orderBy(desc(projects.updatedAt));
}

export async function getAdminProject(id: string) {
  const db = await database();
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!rows[0]) return null;
  const selectedSkills = await db.select({ id: projectSkills.skillId }).from(projectSkills).where(eq(projectSkills.projectId, id)).orderBy(asc(projectSkills.displayOrder));
  return { ...rows[0], skillIds: selectedSkills.map((item) => item.id) };
}

export async function getAdminProjectImages(projectId: string) {
  const db = await database();
  return db.select({
    id: projectImages.id,
    type: projectImages.type,
    altText: projectImages.altText,
    caption: projectImages.caption,
    displayOrder: projectImages.displayOrder,
    url: media.url,
    width: media.width,
    height: media.height,
  }).from(projectImages).innerJoin(media, eq(projectImages.mediaId, media.id)).where(eq(projectImages.projectId, projectId)).orderBy(asc(projectImages.type), asc(projectImages.displayOrder), asc(projectImages.createdAt));
}

async function getPublicSkills(projectIds: string[]) {
  const db = await database();
  if (!projectIds.length) return new Map<string, { name: string; slug: string }[]>();
  const rows = await db.select({ projectId: projectSkills.projectId, name: skills.name, slug: skills.slug })
    .from(projectSkills).innerJoin(skills, eq(projectSkills.skillId, skills.id))
    .where(and(inArray(projectSkills.projectId, projectIds), eq(skills.isVisible, true)))
    .orderBy(asc(projectSkills.displayOrder));
  const map = new Map<string, { name: string; slug: string }[]>();
  for (const row of rows) map.set(row.projectId, [...(map.get(row.projectId) ?? []), { name: row.name, slug: row.slug }]);
  return map;
}

async function getPublicImages(projectIds: string[], type: "cover" | "gallery") {
  const db = await database();
  if (!projectIds.length) return new Map<string, PublicImage[]>();
  const rows = await db.select({
    projectId: projectImages.projectId,
    id: projectImages.id,
    url: media.url,
    width: media.width,
    height: media.height,
    altText: projectImages.altText,
    caption: projectImages.caption,
  }).from(projectImages).innerJoin(media, eq(projectImages.mediaId, media.id))
    .where(and(inArray(projectImages.projectId, projectIds), eq(projectImages.type, type)))
    .orderBy(asc(projectImages.displayOrder), asc(projectImages.createdAt));
  const map = new Map<string, PublicImage[]>();
  for (const row of rows) {
    if (!row.url) continue;
    map.set(row.projectId, [...(map.get(row.projectId) ?? []), { id: row.id, url: row.url, width: row.width, height: row.height, altText: row.altText, caption: row.caption }]);
  }
  return map;
}

export type PublicImage = { id: string; url: string; width: number | null; height: number | null; altText: string; caption: string | null };

export async function listPublicSkillUniverse(): Promise<PublicSkillUniverseNode[]> {
  const db = await database();
  const [visibleSkills, publicRelations] = await Promise.all([
    db.select({ id: skills.id, slug: skills.slug, name: skills.name, category: skills.category })
      .from(skills)
      .where(eq(skills.isVisible, true))
      .orderBy(asc(skills.category), asc(skills.displayOrder), asc(skills.name)),
    db.select({ skillId: projectSkills.skillId })
      .from(projectSkills)
      .innerJoin(projects, eq(projectSkills.projectId, projects.id))
      .where(eq(projects.published, true)),
  ]);
  return buildPublicSkillUniverse(visibleSkills, publicRelations);
}

export async function listPublicProjects(options?: { featured?: boolean; includeInCv?: boolean; limit?: number }) {
  const db = await database();
  const conditions = [eq(projects.published, true)];
  if (options?.featured) conditions.push(eq(projects.featured, true));
  if (options?.includeInCv) conditions.push(eq(projects.includeInCv, true));
  let query = db.select({
    id: projects.id,
    title: projects.title,
    slug: projects.slug,
    shortDescription: projects.shortDescription,
    status: projects.status,
    projectDate: projects.projectDate,
  }).from(projects).where(and(...conditions)).orderBy(desc(projects.projectDate), desc(projects.createdAt)).$dynamic();
  if (options?.limit) query = query.limit(options.limit);
  const rows = await query;
  const ids = rows.map((row) => row.id);
  const [skillMap, coverMap] = await Promise.all([getPublicSkills(ids), getPublicImages(ids, "cover")]);
  return rows.map((row) => ({ ...row, skills: skillMap.get(row.id) ?? [], cover: coverMap.get(row.id)?.[0] ?? null }));
}

export async function getPublicProject(slug: string) {
  const db = await database();
  const rows = await db.select({
    id: projects.id,
    title: projects.title,
    slug: projects.slug,
    shortDescription: projects.shortDescription,
    detailedDescription: projects.detailedDescription,
    problem: projects.problem,
    solution: projects.solution,
    role: projects.role,
    architectureDescription: projects.architectureDescription,
    status: projects.status,
    projectDate: projects.projectDate,
    liveUrl: projects.liveUrl,
    repositoryVisibility: projects.repositoryVisibility,
    repositoryUrl: sql<string | null>`case when ${projects.repositoryVisibility} = 'public' then ${projects.repositoryUrl} else null end`,
  }).from(projects).where(and(eq(projects.slug, slug), eq(projects.published, true))).limit(1);
  if (!rows[0]) return null;
  const [skillMap, coverMap, galleryMap] = await Promise.all([
    getPublicSkills([rows[0].id]), getPublicImages([rows[0].id], "cover"), getPublicImages([rows[0].id], "gallery"),
  ]);
  return { ...rows[0], skills: skillMap.get(rows[0].id) ?? [], cover: coverMap.get(rows[0].id)?.[0] ?? null, gallery: galleryMap.get(rows[0].id) ?? [] };
}

export async function attachUploadedImage(input: {
  projectId: string; key: string; url: string; mimeType: string; size: number;
  width: number | null; height: number | null; altText: string; caption: string | null; type: "cover" | "gallery";
}) {
  const db = await database();
  const mediaId = crypto.randomUUID();
  const imageId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    if (input.type === "cover") await tx.delete(projectImages).where(and(eq(projectImages.projectId, input.projectId), eq(projectImages.type, "cover")));
    const [{ nextOrder }] = await tx.select({ nextOrder: sql<number>`coalesce(max(${projectImages.displayOrder}), -1) + 1` }).from(projectImages).where(and(eq(projectImages.projectId, input.projectId), eq(projectImages.type, input.type)));
    await tx.insert(media).values({ id: mediaId, storageKey: input.key, url: input.url, mimeType: input.mimeType, size: input.size, width: input.width, height: input.height, altText: input.altText });
    await tx.insert(projectImages).values({ id: imageId, projectId: input.projectId, mediaId, altText: input.altText, caption: input.caption, type: input.type, displayOrder: Number(nextOrder) });
  });
  return imageId;
}

export async function removeProjectImage(projectId: string, imageId: string) {
  const db = await database();
  const deleted = await db.delete(projectImages).where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, projectId))).returning({ id: projectImages.id });
  return deleted.length > 0;
}

export async function moveProjectImage(projectId: string, imageId: string, direction: "up" | "down") {
  const db = await database();
  return db.transaction(async (tx) => {
    const currentRows = await tx.select({ id: projectImages.id, displayOrder: projectImages.displayOrder, type: projectImages.type }).from(projectImages).where(and(eq(projectImages.id, imageId), eq(projectImages.projectId, projectId))).limit(1);
    const current = currentRows[0];
    if (!current || current.type !== "gallery") return false;
    const ordered = await tx.select({ id: projectImages.id }).from(projectImages).where(and(eq(projectImages.projectId, projectId), eq(projectImages.type, "gallery"))).orderBy(asc(projectImages.displayOrder), asc(projectImages.createdAt));
    const index = ordered.findIndex((item) => item.id === imageId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return true;
    for (const [displayOrder, item] of ordered.entries()) {
      await tx.update(projectImages).set({ displayOrder }).where(eq(projectImages.id, item.id));
    }
    await tx.update(projectImages).set({ displayOrder: targetIndex }).where(eq(projectImages.id, ordered[index].id));
    await tx.update(projectImages).set({ displayOrder: index }).where(eq(projectImages.id, ordered[targetIndex].id));
    return true;
  });
}

// ---------- Phase 7: lean public index + private repository guard ----------

/** Title/slug/summary of published projects only — the command palette/terminal index. */
export async function listPublicProjectIndex() {
  const db = await database();
  return db.select({ title: projects.title, slug: projects.slug, shortDescription: projects.shortDescription })
    .from(projects).where(eq(projects.published, true))
    .orderBy(desc(projects.projectDate), desc(projects.createdAt));
}

/**
 * Server-only: repository URLs the admin marked as private (published or not).
 * Used exclusively to *exclude* matching repos from the GitHub section; the URLs
 * themselves never leave the server.
 */
export async function listPrivateRepositoryUrls() {
  const db = await database();
  const rows = await db.select({ url: projects.repositoryUrl }).from(projects)
    .where(eq(projects.repositoryVisibility, "private"));
  return rows.flatMap((row) => (row.url ? [row.url] : []));
}

/** Visible skill names/categories only (no ids, no hidden skills). */
export async function listPublicSkillIndex() {
  const db = await database();
  return db.select({ name: skills.name, category: skills.category }).from(skills)
    .where(eq(skills.isVisible, true)).orderBy(asc(skills.category), asc(skills.displayOrder), asc(skills.name));
}
