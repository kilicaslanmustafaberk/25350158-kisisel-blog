import { z } from "zod";

import { postStatusValues } from "@/db/schema/content";
import { MAX_CONTENT_JSON_LENGTH, postContentSchema } from "@/features/blog/content-schema";
import { toSlug } from "@/features/projects/validation";

export { toSlug };

const optionalText = (maximum: number) => z.string().trim().max(maximum).transform((value) => value || null);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const postInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: slugSchema,
  excerpt: z.string().trim().min(10).max(500),
  content: postContentSchema.refine(
    (value) => JSON.stringify(value).length <= MAX_CONTENT_JSON_LENGTH,
    `İçerik ${MAX_CONTENT_JSON_LENGTH} karakter sınırını aşıyor.`,
  ),
  categoryId: z.union([z.literal(""), z.uuid()]).transform((value) => value || null),
  tagIds: z.array(z.uuid()).max(30).transform((ids) => [...new Set(ids)]),
  newTagNames: z
    .array(z.string().trim().min(1).max(40))
    .max(10)
    .default([])
    .transform((names) => [...new Set(names.map((name) => name.trim()).filter(Boolean))]),
  status: z.enum(postStatusValues),
  publishedAt: z.union([z.literal(""), z.iso.datetime({ offset: true }), z.iso.date()]).transform((value) => value || null),
  seoTitle: optionalText(70),
  seoDescription: optionalText(160),
});

export type PostInput = z.infer<typeof postInputSchema>;

export const postIdSchema = z.uuid();

export const postStateSchema = z.object({ status: z.enum(postStatusValues) });

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: optionalText(300),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categoryIdSchema = z.uuid();

export const coverFinalizeSchema = z.object({
  uploadToken: z.string().min(20).max(2_000),
  altText: z.string().trim().min(3).max(300),
  width: z.number().int().positive().max(20_000).nullable(),
  height: z.number().int().positive().max(20_000).nullable(),
});
