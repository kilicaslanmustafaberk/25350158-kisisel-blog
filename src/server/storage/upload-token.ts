import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { cvPdfKeySchema, cvPdfMimeType, maxCvPdfBytes } from "@/features/cv/uploaded-pdf";
import { allowedImageTypes, maxImageBytes, storedImageKeySchema } from "@/features/media/validation";
import { getAuthEnvironment } from "@/server/env-core";

export const uploadScopeValues = ["projects", "blog"] as const;
export type UploadScope = (typeof uploadScopeValues)[number];

const payloadSchema = z.object({
  scope: z.enum(uploadScopeValues),
  resourceId: z.uuid(),
  key: storedImageKeySchema,
  mimeType: z.enum(allowedImageTypes),
  expectedSize: z.number().int().positive().max(maxImageBytes),
  expiresAt: z.number().int(),
});

export type UploadTokenPayload = z.infer<typeof payloadSchema>;

function signature(encoded: string) {
  return createHmac("sha256", getAuthEnvironment().secret).update(encoded).digest("base64url");
}

export function createUploadToken(payload: UploadTokenPayload) {
  if (!payload.key.startsWith(`${payload.scope}/`)) {
    throw new Error("Upload key does not match its scope namespace.");
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

// ---------- 1.9.0: professional CV PDF upload ticket ----------
// Separate schema and a domain-separated HMAC input, so an image ticket can never be
// replayed as a CV ticket (or the reverse). The image ticket format above is unchanged.

const cvPayloadSchema = z.object({
  scope: z.literal("cv"),
  key: cvPdfKeySchema,
  mimeType: z.literal(cvPdfMimeType),
  expectedSize: z.number().int().positive().max(maxCvPdfBytes),
  originalName: z.string().min(1).max(120),
  expiresAt: z.number().int(),
});

export type CvUploadTokenPayload = z.infer<typeof cvPayloadSchema>;

function cvSignature(encoded: string) {
  return createHmac("sha256", getAuthEnvironment().secret).update(`cv-upload:${encoded}`).digest("base64url");
}

export function createCvUploadToken(payload: CvUploadTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(cvPayloadSchema.parse(payload))).toString("base64url");
  return `${encoded}.${cvSignature(encoded)}`;
}

export function verifyCvUploadToken(token: string) {
  const [encoded, supplied, extra] = token.split(".");
  if (!encoded || !supplied || extra !== undefined) return null;
  const a = Buffer.from(supplied);
  const b = Buffer.from(cvSignature(encoded));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = cvPayloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
    return payload.expiresAt < Date.now() ? null : payload;
  } catch {
    return null;
  }
}

export function verifyUploadToken(token: string, scope: UploadScope, resourceId: string) {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return null;
  const expected = signature(encoded);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = payloadSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
    if (payload.scope !== scope || payload.resourceId !== resourceId || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
