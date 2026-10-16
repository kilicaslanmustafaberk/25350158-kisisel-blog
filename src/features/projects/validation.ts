import { z } from "zod";

import { projectStatusValues, repositoryVisibilityValues } from "@/db/schema/content";
import { allowedImageTypes, maxImageBytes, uploadRequestSchema } from "@/features/media/validation";

export { allowedImageTypes, uploadRequestSchema };
export const maxProjectImageBytes = maxImageBytes;

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).transform((value) => value || null);
const optionalUrl = z
  .union([z.literal(""), z.url({ protocol: /^https?$/ })])
  .transform((value) => value || null);

export const projectInputSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    shortDescription: z.string().trim().min(10).max(320),
    detailedDescription: optionalText(20_000),
    problem: optionalText(12_000),
    solution: optionalText(12_000),
    role: optionalText(500),
    architectureDescription: optionalText(12_000),
    status: z.enum(projectStatusValues),
    projectDate: z.union([z.literal(""), z.iso.date()]).transform((value) => value || null),
    liveUrl: optionalUrl,
    repositoryVisibility: z.enum(repositoryVisibilityValues),
    repositoryUrl: optionalUrl,
    featured: z.boolean(),
    published: z.boolean(),
    includeInCv: z.boolean(),
    skillIds: z.array(z.uuid()).max(100).transform((ids) => [...new Set(ids)]),
  })
  .superRefine((value, context) => {
    if (value.repositoryVisibility === "none" && value.repositoryUrl) {
      context.addIssue({ code: "custom", path: ["repositoryUrl"], message: "Repository URL, visibility 'none' iken boş olmalıdır." });
    }
    if (value.repositoryVisibility === "public" && !value.repositoryUrl) {
      context.addIssue({ code: "custom", path: ["repositoryUrl"], message: "Public repository için URL gereklidir." });
    }
  });

export const projectIdSchema = z.uuid();
export const imageIdSchema = z.uuid();
export const projectStateSchema = z.object({
  field: z.enum(["published", "featured", "includeInCv"]),
  value: z.boolean(),
});

export const uploadFinalizeSchema = z.object({
  uploadToken: z.string().min(20).max(2_000),
  altText: z.string().trim().min(3).max(300),
  caption: optionalText(500),
  type: z.enum(["cover", "gallery"]),
  width: z.number().int().positive().max(20_000).nullable(),
  height: z.number().int().positive().max(20_000).nullable(),
});

export const imageMoveSchema = z.object({ direction: z.enum(["up", "down"]) });

export type ProjectInput = z.infer<typeof projectInputSchema>;

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
