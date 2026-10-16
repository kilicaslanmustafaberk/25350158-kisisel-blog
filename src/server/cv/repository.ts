import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { education, experiences, media, profiles, skills, socialLinks, cvSettings } from "@/db/schema";
import { cvSectionIds, type CvSectionId, type CvSettingsInput, type EducationInput, type ExperienceInput, type ProfileInput, type SkillInput } from "@/features/cv/validation";
import { toSafeExternalUrl } from "@/features/navigation/safe-href";
import { cvSummary, displayOptionalText, normalizePhone } from "@/features/cv/contact";
import type { SocialLinkInput } from "@/features/social/validation";
import { listPublicProjects } from "@/server/projects/repository";
import { listCvCertificates } from "@/server/certificates/repository";
import type { PublicCertificate } from "@/features/certificates/display";

async function database() {
  return (await import("@/db")).db;
}

const PRIMARY_ID = "primary";

function normalizeSectionOrder(order: string[]): CvSectionId[] {
  const valid = order.filter((id): id is CvSectionId => (cvSectionIds as readonly string[]).includes(id));
  const missing = cvSectionIds.filter((id) => !valid.includes(id));
  return [...valid, ...missing];
}

// ---------- Profile ----------

export async function getProfile() {
  const db = await database();
  const rows = await db.select().from(profiles).where(eq(profiles.id, PRIMARY_ID)).limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(input: ProfileInput) {
  const db = await database();
  const values = {
    id: PRIMARY_ID,
    fullName: input.fullName,
    headline: input.headline,
    shortBio: input.shortBio,
    longBio: input.longBio,
    location: input.location,
    email: input.email,
    phone: input.phone,
    isPhoneVisible: input.isPhoneVisible,
    isEmailVisible: input.isEmailVisible,
    isLocationVisible: input.isLocationVisible,
    availableForWork: input.availableForWork,
    updatedAt: new Date(),
  };
  await db.insert(profiles).values({ ...values, createdAt: new Date() }).onConflictDoUpdate({ target: profiles.id, set: values });
}

// ---------- Education ----------

export async function listEducation() {
  const db = await database();
  return db.select().from(education).orderBy(asc(education.displayOrder), asc(education.startDate));
}

export async function createEducation(input: EducationInput) {
  const db = await database();
  const id = crypto.randomUUID();
  const [{ nextOrder }] = await db.select({ nextOrder: sql<number>`coalesce(max(${education.displayOrder}), -1) + 1` }).from(education);
  await db.insert(education).values({
    id,
    profileId: PRIMARY_ID,
    institution: input.institution,
    program: input.program,
    startDate: input.startDate,
    endDate: input.endDate,
    isCurrent: input.isCurrent,
    description: input.description,
    isVisible: input.isVisible,
    displayOrder: Number(nextOrder),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export async function updateEducation(id: string, input: EducationInput) {
  const db = await database();
  const updated = await db
    .update(education)
    .set({
      institution: input.institution,
      program: input.program,
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: input.isCurrent,
      description: input.description,
      isVisible: input.isVisible,
      updatedAt: new Date(),
    })
    .where(eq(education.id, id))
    .returning({ id: education.id });
  return updated.length > 0;
}

export async function deleteEducation(id: string) {
  const db = await database();
  const deleted = await db.delete(education).where(eq(education.id, id)).returning({ id: education.id });
  return deleted.length > 0;
}

export async function moveEducation(id: string, direction: "up" | "down") {
  const db = await database();
  return db.transaction(async (tx) => {
    const currentRows = await tx.select({ id: education.id }).from(education).where(eq(education.id, id)).limit(1);
    if (!currentRows[0]) return false;
    const ordered = await tx.select({ id: education.id }).from(education).orderBy(asc(education.displayOrder));
    const index = ordered.findIndex((item) => item.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return true;
    for (const [displayOrder, item] of ordered.entries()) {
      await tx.update(education).set({ displayOrder }).where(eq(education.id, item.id));
    }
    await tx.update(education).set({ displayOrder: targetIndex }).where(eq(education.id, ordered[index].id));
    await tx.update(education).set({ displayOrder: index }).where(eq(education.id, ordered[targetIndex].id));
    return true;
  });
}

// ---------- Experience ----------

export async function listExperiences() {
  const db = await database();
  return db.select().from(experiences).orderBy(asc(experiences.displayOrder), asc(experiences.startDate));
}

export async function createExperience(input: ExperienceInput) {
  const db = await database();
  const id = crypto.randomUUID();
  const [{ nextOrder }] = await db.select({ nextOrder: sql<number>`coalesce(max(${experiences.displayOrder}), -1) + 1` }).from(experiences);
  await db.insert(experiences).values({
    id,
    profileId: PRIMARY_ID,
    organization: input.organization,
    position: input.position,
    startDate: input.startDate,
    endDate: input.endDate,
    isCurrent: input.isCurrent,
    description: input.description,
    isVisible: input.isVisible,
    displayOrder: Number(nextOrder),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export async function updateExperience(id: string, input: ExperienceInput) {
  const db = await database();
  const updated = await db
    .update(experiences)
    .set({
      organization: input.organization,
      position: input.position,
      startDate: input.startDate,
      endDate: input.endDate,
      isCurrent: input.isCurrent,
      description: input.description,
      isVisible: input.isVisible,
      updatedAt: new Date(),
    })
    .where(eq(experiences.id, id))
    .returning({ id: experiences.id });
  return updated.length > 0;
}

export async function deleteExperience(id: string) {
  const db = await database();
  const deleted = await db.delete(experiences).where(eq(experiences.id, id)).returning({ id: experiences.id });
  return deleted.length > 0;
}

export async function moveExperience(id: string, direction: "up" | "down") {
  const db = await database();
  return db.transaction(async (tx) => {
    const currentRows = await tx.select({ id: experiences.id }).from(experiences).where(eq(experiences.id, id)).limit(1);
    if (!currentRows[0]) return false;
    const ordered = await tx.select({ id: experiences.id }).from(experiences).orderBy(asc(experiences.displayOrder));
    const index = ordered.findIndex((item) => item.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return true;
    for (const [displayOrder, item] of ordered.entries()) {
      await tx.update(experiences).set({ displayOrder }).where(eq(experiences.id, item.id));
    }
    await tx.update(experiences).set({ displayOrder: targetIndex }).where(eq(experiences.id, ordered[index].id));
    await tx.update(experiences).set({ displayOrder: index }).where(eq(experiences.id, ordered[targetIndex].id));
    return true;
  });
}

// ---------- Skills ----------

export async function listSkillsAdmin() {
  const db = await database();
  return db.select().from(skills).orderBy(asc(skills.category), asc(skills.displayOrder), asc(skills.name));
}

export async function skillSlugExists(slug: string, exceptId?: string) {
  const db = await database();
  const rows = await db.select({ id: skills.id }).from(skills).where(eq(skills.slug, slug));
  return rows.some((row) => row.id !== exceptId);
}

export async function createSkill(input: SkillInput) {
  const db = await database();
  const id = crypto.randomUUID();
  const [{ nextOrder }] = await db
    .select({ nextOrder: sql<number>`coalesce(max(${skills.displayOrder}), -1) + 1` })
    .from(skills)
    .where(eq(skills.category, input.category));
  await db.insert(skills).values({
    id,
    name: input.name,
    slug: input.slug,
    category: input.category,
    description: input.description,
    isVisible: input.isVisible,
    displayOrder: Number(nextOrder),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export async function updateSkill(id: string, input: SkillInput) {
  const db = await database();
  const updated = await db
    .update(skills)
    .set({
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description,
      isVisible: input.isVisible,
      updatedAt: new Date(),
    })
    .where(eq(skills.id, id))
    .returning({ id: skills.id });
  return updated.length > 0;
}

/** project_skills.skill_id has onDelete: cascade — deleting a skill silently detaches it from every project. */
export async function deleteSkill(id: string) {
  const db = await database();
  const deleted = await db.delete(skills).where(eq(skills.id, id)).returning({ id: skills.id });
  return deleted.length > 0;
}

export async function moveSkillWithinCategory(id: string, direction: "up" | "down") {
  const db = await database();
  return db.transaction(async (tx) => {
    const currentRows = await tx.select({ id: skills.id, category: skills.category }).from(skills).where(eq(skills.id, id)).limit(1);
    const current = currentRows[0];
    if (!current) return false;
    const ordered = await tx.select({ id: skills.id }).from(skills).where(eq(skills.category, current.category)).orderBy(asc(skills.displayOrder), asc(skills.name));
    const index = ordered.findIndex((item) => item.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return true;
    for (const [displayOrder, item] of ordered.entries()) {
      await tx.update(skills).set({ displayOrder }).where(eq(skills.id, item.id));
    }
    await tx.update(skills).set({ displayOrder: targetIndex }).where(eq(skills.id, ordered[index].id));
    await tx.update(skills).set({ displayOrder: index }).where(eq(skills.id, ordered[targetIndex].id));
    return true;
  });
}

// ---------- CV settings ----------

const defaultCvSettings = {
  title: "Özgeçmiş",
  summaryOverride: null as string | null,
  language: "tr" as const,
  template: "classic",
  sectionVisibility: {} as Record<string, boolean>,
  sectionOrder: [] as string[],
  maxProjects: 6,
};

export async function getCvSettings() {
  const db = await database();
  // Explicit columns: the uploaded-PDF metadata (1.9.0) is read separately by
  // server/cv/uploaded-pdf.ts, so Web CV settings never depend on those columns.
  const rows = await db
    .select({
      id: cvSettings.id,
      title: cvSettings.title,
      summaryOverride: cvSettings.summaryOverride,
      language: cvSettings.language,
      template: cvSettings.template,
      sectionVisibility: cvSettings.sectionVisibility,
      sectionOrder: cvSettings.sectionOrder,
      maxProjects: cvSettings.maxProjects,
      updatedAt: cvSettings.updatedAt,
    })
    .from(cvSettings)
    .where(eq(cvSettings.id, PRIMARY_ID))
    .limit(1);
  return rows[0] ?? { id: PRIMARY_ID, ...defaultCvSettings, updatedAt: null };
}

export async function upsertCvSettings(input: CvSettingsInput) {
  const db = await database();
  const values = {
    id: PRIMARY_ID,
    title: input.title,
    summaryOverride: input.summaryOverride,
    language: input.language,
    template: "classic",
    sectionVisibility: input.sectionVisibility,
    sectionOrder: input.sectionOrder,
    maxProjects: input.maxProjects,
    updatedAt: new Date(),
  };
  await db.insert(cvSettings).values(values).onConflictDoUpdate({ target: cvSettings.id, set: values });
}

// ---------- Public CV DTO (single source of truth for /cv, the PDF generator and the ATS checker) ----------

export type PublicCvData = {
  title: string;
  language: "tr" | "en";
  summary: string;
  profile: {
    fullName: string;
    headline: string;
    location: string | null;
    email: string | null;
    phone?: string | null;
    availableForWork: boolean;
    avatarUrl: string | null;
  };
  skills: { id: string; name: string; category: string }[];
  projects: { id: string; title: string; slug: string; shortDescription: string; projectDate: string | null; skills: { name: string }[] }[];
  experience: { id: string; organization: string; position: string; startDate: string; endDate: string | null; isCurrent: boolean; description: string | null }[];
  education: { id: string; institution: string; program: string; startDate: string; endDate: string | null; isCurrent: boolean; description: string | null }[];
  /** Phase 18: `is_visible AND show_in_cv`, filtered in SQL. */
  certificates: PublicCertificate[];
  socialLinks: { id: string; platform: string; label: string; url: string }[];
  sectionOrder: CvSectionId[];
  sectionVisibility: Record<string, boolean>;
};

export async function getPublicCvData(): Promise<PublicCvData | null> {
  const db = await database();
  const profile = await getProfile();
  if (!profile) return null;
  const settings = await getCvSettings();

  const [visibleEducation, visibleExperience, visibleSkills, visibleLinks, cvProjects, avatarRows, cvCertificates] = await Promise.all([
    db.select().from(education).where(and(eq(education.profileId, PRIMARY_ID), eq(education.isVisible, true))).orderBy(asc(education.displayOrder)),
    db.select().from(experiences).where(and(eq(experiences.profileId, PRIMARY_ID), eq(experiences.isVisible, true))).orderBy(asc(experiences.displayOrder)),
    db.select({ id: skills.id, name: skills.name, category: skills.category }).from(skills).where(eq(skills.isVisible, true)).orderBy(asc(skills.category), asc(skills.displayOrder)),
    db.select().from(socialLinks).where(and(eq(socialLinks.profileId, PRIMARY_ID), eq(socialLinks.isVisible, true), eq(socialLinks.showInCv, true))).orderBy(asc(socialLinks.displayOrder)),
    listPublicProjects({ includeInCv: true, limit: settings.maxProjects }),
    profile.avatarMediaId ? db.select({ url: media.url }).from(media).where(eq(media.id, profile.avatarMediaId)).limit(1) : Promise.resolve([]),
    listCvCertificates(),
  ]);

  return {
    title: settings.title,
    language: settings.language as "tr" | "en",
    summary: cvSummary(settings.summaryOverride, profile.longBio),
    profile: {
      fullName: profile.fullName,
      headline: profile.headline,
      location: profile.isLocationVisible ? profile.location : null,
      email: profile.isEmailVisible ? profile.email : null,
      phone: profile.isPhoneVisible && profile.phone && normalizePhone(profile.phone) ? profile.phone : null,
      availableForWork: profile.availableForWork,
      avatarUrl: avatarRows[0]?.url ?? null,
    },
    skills: visibleSkills,
    projects: cvProjects.map((project) => ({
      id: project.id,
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription,
      projectDate: project.projectDate,
      skills: project.skills,
    })),
    experience: visibleExperience.map((row) => ({
      id: row.id,
      organization: row.organization,
      position: row.position,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrent: row.isCurrent,
      description: displayOptionalText(row.description) || null,
    })),
    education: visibleEducation.map((row) => ({
      id: row.id,
      institution: row.institution,
      program: displayOptionalText(row.program),
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrent: row.isCurrent,
      description: displayOptionalText(row.description) || null,
    })),
    certificates: cvCertificates,
    // Phase 7 hardening: only HTTPS links reach the public DTO (web CV, PDF, landing).
    socialLinks: visibleLinks.flatMap((row) => {
      const url = toSafeExternalUrl(row.url);
      return url ? [{ id: row.id, platform: row.platform, label: row.label, url }] : [];
    }),
    sectionOrder: normalizeSectionOrder(settings.sectionOrder),
    sectionVisibility: settings.sectionVisibility,
  };
}

// ---------- Phase 7: lean public identity (layout/footer/command palette) ----------

export type PublicSiteIdentity = {
  fullName: string;
  headline: string;
  summary: string;
  email: string | null;
  phone: string | null;
  shortBio: string;
  longBio: string | null;
  socialLinks: { platform: string; label: string; url: string }[];
};

/** Same privacy rules as getPublicCvData (hidden email / invisible links excluded), fewer queries. */
export async function getPublicSiteIdentity(cvOnly = false): Promise<PublicSiteIdentity | null> {
  const db = await database();
  const profile = await getProfile();
  if (!profile) return null;
  const [settings, links] = await Promise.all([
    getCvSettings(),
    db.select({ platform: socialLinks.platform, label: socialLinks.label, url: socialLinks.url }).from(socialLinks)
      .where(and(eq(socialLinks.profileId, PRIMARY_ID), eq(socialLinks.isVisible, true), cvOnly ? eq(socialLinks.showInCv, true) : undefined)).orderBy(asc(socialLinks.displayOrder)),
  ]);
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    summary: cvSummary(settings.summaryOverride, profile.longBio),
    shortBio: profile.shortBio,
    longBio: profile.longBio,
    phone: profile.isPhoneVisible && profile.phone && normalizePhone(profile.phone) ? profile.phone : null,
    email: profile.isEmailVisible ? profile.email : null,
    socialLinks: links.flatMap((link) => {
      const url = toSafeExternalUrl(link.url);
      return url ? [{ ...link, url }] : [];
    }),
  };
}

// ---------- Phase 8: Social links CMS ----------

export async function listSocialLinksAdmin() {
  const db = await database();
  return db.select({ id: socialLinks.id, platform: socialLinks.platform, label: socialLinks.label, url: socialLinks.url, displayOrder: socialLinks.displayOrder, isVisible: socialLinks.isVisible, showInCv: socialLinks.showInCv })
    .from(socialLinks).where(eq(socialLinks.profileId, PRIMARY_ID)).orderBy(asc(socialLinks.displayOrder), asc(socialLinks.createdAt));
}

/** Returns null when no profile exists yet (social_links.profile_id is a required FK). */
export async function createSocialLink(input: SocialLinkInput) {
  const db = await database();
  if (!(await getProfile())) return null;
  const id = crypto.randomUUID();
  const [{ nextOrder }] = await db.select({ nextOrder: sql<number>`coalesce(max(${socialLinks.displayOrder}), -1) + 1` }).from(socialLinks).where(eq(socialLinks.profileId, PRIMARY_ID));
  await db.insert(socialLinks).values({
    id,
    profileId: PRIMARY_ID,
    platform: input.platform,
    label: input.label,
    url: input.url,
    showInCv: input.showInCv,
    isVisible: input.isVisible,
    displayOrder: Number(nextOrder),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

export async function updateSocialLink(id: string, input: SocialLinkInput) {
  const db = await database();
  const updated = await db.update(socialLinks)
    .set({ platform: input.platform, label: input.label, url: input.url, isVisible: input.isVisible, showInCv: input.showInCv, updatedAt: new Date() })
    .where(and(eq(socialLinks.id, id), eq(socialLinks.profileId, PRIMARY_ID)))
    .returning({ id: socialLinks.id });
  return updated.length > 0;
}

export async function deleteSocialLink(id: string) {
  const db = await database();
  const deleted = await db.delete(socialLinks).where(and(eq(socialLinks.id, id), eq(socialLinks.profileId, PRIMARY_ID))).returning({ id: socialLinks.id });
  return deleted.length > 0;
}

export async function moveSocialLink(id: string, direction: "up" | "down") {
  const db = await database();
  return db.transaction(async (tx) => {
    const ordered = await tx.select({ id: socialLinks.id }).from(socialLinks).where(eq(socialLinks.profileId, PRIMARY_ID)).orderBy(asc(socialLinks.displayOrder), asc(socialLinks.createdAt));
    const index = ordered.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return true;
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
    for (const [displayOrder, item] of ordered.entries()) {
      await tx.update(socialLinks).set({ displayOrder }).where(eq(socialLinks.id, item.id));
    }
    return true;
  });
}
