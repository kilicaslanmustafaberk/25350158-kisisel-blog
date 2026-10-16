import { z } from "zod";

import { toSlug } from "@/features/projects/validation";
import { phoneInputSchema } from "@/features/cv/contact";

export { toSlug };

const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD biçiminde olmalıdır.");

export const cvLanguageValues = ["tr", "en"] as const;
export const cvSectionIds = ["summary", "experience", "education", "certificates", "projects", "skills"] as const;
export type CvSectionId = (typeof cvSectionIds)[number];

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(2).max(160),
  shortBio: z.string().trim().min(10).max(600),
  longBio: optionalText(4_000),
  location: optionalText(120),
  email: z.union([z.literal(""), z.email()]).transform((value) => value || null),
  phone: phoneInputSchema.default(""),
  isPhoneVisible: z.boolean().default(false),
  isEmailVisible: z.boolean(),
  isLocationVisible: z.boolean(),
  availableForWork: z.boolean(),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

function withDateConsistency<T extends { startDate: string; endDate: string | null; isCurrent: boolean }>(schema: z.ZodType<T>) {
  return schema.superRefine((value, ctx) => {
    if (value.isCurrent && value.endDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Devam eden kayıtta bitiş tarihi olamaz." });
    }
    if (!value.isCurrent && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Bitiş tarihi başlangıç tarihinden önce olamaz." });
    }
  });
}

export const educationInputSchema = withDateConsistency(
  z.object({
    institution: z.string().trim().min(2).max(160),
    program: z.string().trim().max(160).default(""),
    startDate: isoDate,
    endDate: z.union([z.literal(""), isoDate]).transform((value) => value || null),
    isCurrent: z.boolean(),
    description: optionalText(2_000),
    isVisible: z.boolean(),
  }),
);
export type EducationInput = z.infer<typeof educationInputSchema>;

export const experienceInputSchema = withDateConsistency(
  z.object({
    organization: z.string().trim().min(2).max(160),
    position: z.string().trim().min(2).max(160),
    startDate: isoDate,
    endDate: z.union([z.literal(""), isoDate]).transform((value) => value || null),
    isCurrent: z.boolean(),
    description: optionalText(2_000),
    isVisible: z.boolean(),
  }),
);
export type ExperienceInput = z.infer<typeof experienceInputSchema>;

export const skillInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  category: z.string().trim().min(2).max(60),
  description: optionalText(300),
  isVisible: z.boolean(),
});
export type SkillInput = z.infer<typeof skillInputSchema>;

export const moveDirectionSchema = z.object({ direction: z.enum(["up", "down"]) });

export const cvSettingsInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  summaryOverride: optionalText(1_000),
  language: z.enum(cvLanguageValues),
  sectionVisibility: z.partialRecord(z.enum(cvSectionIds), z.boolean()).default({}),
  sectionOrder: z
    .array(z.enum(cvSectionIds))
    .transform((order) => {
      const deduped = [...new Set(order)];
      const missing = cvSectionIds.filter((id) => !deduped.includes(id));
      return [...deduped, ...missing];
    }),
  maxProjects: z.number().int().min(1).max(20),
});
export type CvSettingsInput = z.infer<typeof cvSettingsInputSchema>;

export const idSchema = z.uuid();
