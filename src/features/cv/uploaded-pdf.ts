import { z } from "zod";

import { toSlug } from "@/features/projects/validation";

// 1.9.0 — admin-uploaded professional CV PDF. Pure helpers shared by the admin
// upload routes, the public /api/cv/pdf endpoint and the unit tests.

export const cvPdfMimeType = "application/pdf" as const;
export const maxCvPdfBytes = 5 * 1024 * 1024;

/** Immutable object keys only: `cv/<uuid>.pdf`. Nothing else may be served as the CV. */
export const cvPdfKeySchema = z.string().regex(/^cv\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/);

/** Strips any path, control and quote characters so the name is safe to store and display. */
export function sanitizeCvFileName(value: string) {
  const base = value.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned;
}

export const cvPdfUploadRequestSchema = z.object({
  fileName: z
    .string()
    .max(255)
    .transform(sanitizeCvFileName)
    .refine((name) => name.length >= 5 && /\.pdf$/i.test(name), "Dosya adı .pdf ile bitmelidir."),
  mimeType: z.literal(cvPdfMimeType),
  size: z.number().int().positive().max(maxCvPdfBytes),
});

export const cvPdfFinalizeSchema = z.object({
  uploadToken: z.string().min(20).max(4096),
});

/** Real PDF files start with the `%PDF-` header; renamed HTML/SVG/images do not. */
export function hasPdfSignature(bytes: Uint8Array) {
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return bytes.length >= header.length && header.every((value, index) => bytes[index] === value);
}

/** Stable, professional download name, never the storage UUID. */
export function cvDownloadFileName(fullName: string | null | undefined) {
  const slug = fullName ? toSlug(fullName) : "";
  return slug ? `${slug}-cv.pdf` : "cv.pdf";
}

export function cvContentDisposition(mode: "inline" | "attachment", fileName: string) {
  const safe = fileName.replace(/[^a-z0-9.-]/gi, "") || "cv.pdf";
  return `${mode}; filename="${safe}"`;
}

export function formatCvFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
}
