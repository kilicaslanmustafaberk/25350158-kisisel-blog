import { z } from "zod";

import { toSafeExternalUrl } from "@/features/navigation/safe-href";

// Phase 18 certificates CMS validation. Only the certificate name is required; every other
// field is optional and an empty string is stored as NULL (never a placeholder such as "--").

const optionalText = (maximum: number) => z.string().trim().max(maximum).default("").transform((value) => value || null);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-MM-DD biçiminde olmalıdır.");
const optionalDate = z.union([z.literal(""), isoDate]).default("").transform((value) => value || null);

/**
 * Verification links follow the project's public URL policy (same as social links / navigation):
 * credential-free https only. `javascript:`, `data:`, `http:` and custom schemes are rejected.
 */
export function normalizeCredentialUrl(value: string): string | null {
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return null;
  return toSafeExternalUrl(value);
}

export const certificateInputSchema = z
  .object({
    title: z.string().trim().min(2, "Sertifika adı en az 2 karakter olmalıdır.").max(160),
    issuer: optionalText(120),
    instructor: optionalText(120),
    issuedAt: optionalDate,
    expiresAt: optionalDate,
    credentialId: optionalText(120),
    credentialUrl: z.string().trim().max(500).default(""),
    description: optionalText(1_000),
    isVisible: z.boolean(),
    showInCv: z.boolean(),
  })
  .transform((value, ctx) => {
    let credentialUrl: string | null = null;
    if (value.credentialUrl) {
      credentialUrl = normalizeCredentialUrl(value.credentialUrl);
      if (!credentialUrl) {
        ctx.addIssue({ code: "custom", path: ["credentialUrl"], message: "Doğrulama linki yalnız https:// ile başlayan geçerli bir adres olabilir." });
        return z.NEVER;
      }
    }
    if (value.issuedAt && value.expiresAt && value.expiresAt < value.issuedAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Geçerlilik bitişi veriliş tarihinden önce olamaz." });
      return z.NEVER;
    }
    return { ...value, credentialUrl };
  });

export type CertificateInput = z.infer<typeof certificateInputSchema>;
