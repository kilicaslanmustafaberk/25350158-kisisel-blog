import { displayOptionalText } from "@/features/cv/contact";
import { toSafeExternalUrl } from "@/features/navigation/safe-href";

/** Landing pinned sequence stays short: each item adds ~0.42 viewport of sticky scroll. */
export const LANDING_CERTIFICATE_LIMIT = 4;

export type CertificateRow = {
  id: string;
  title: string;
  issuer: string | null;
  instructor: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  description: string | null;
  displayOrder: number;
};

/** Public DTO: no visibility flags or timestamps; empty/placeholder values are null. */
export type PublicCertificate = {
  id: string;
  title: string;
  issuer: string | null;
  instructor: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  description: string | null;
};

const clean = (value: string | null | undefined) => displayOptionalText(value) || null;
const isoDate = (value: string | null | undefined) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

/**
 * Deterministic order shared by admin, landing and CV: explicit display order first, then the
 * newest issue date (undated last), then title and id as stable tie-breakers.
 */
export function compareCertificates(a: CertificateRow, b: CertificateRow): number {
  if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
  if (a.issuedAt !== b.issuedAt) {
    if (!a.issuedAt) return 1;
    if (!b.issuedAt) return -1;
    return a.issuedAt < b.issuedAt ? 1 : -1;
  }
  return a.title.localeCompare(b.title, "tr") || a.id.localeCompare(b.id);
}

export function toPublicCertificate(row: CertificateRow): PublicCertificate {
  return {
    id: row.id,
    title: row.title.trim(),
    issuer: clean(row.issuer),
    instructor: clean(row.instructor),
    issuedAt: isoDate(row.issuedAt),
    expiresAt: isoDate(row.expiresAt),
    credentialId: clean(row.credentialId),
    // Defence in depth: stored links are re-checked against the https-only policy on every read.
    credentialUrl: row.credentialUrl ? toSafeExternalUrl(row.credentialUrl) : null,
    description: clean(row.description),
  };
}

export function buildPublicCertificates(rows: CertificateRow[], limit?: number): PublicCertificate[] {
  const sorted = [...rows].sort(compareCertificates).map(toPublicCertificate).filter((item) => item.title.length > 0);
  return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit));
}

/** ISO "YYYY-MM-DD" → "MM/YYYY" (same convention as CV education/experience dates). */
export function formatCertificateDate(value: string | null): string | null {
  if (!value) return null;
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

const labels = {
  tr: { expires: "Geçerlilik", instructor: "Eğitmen", credential: "Sertifika No", verify: "Doğrula", verifyLink: "Doğrulama bağlantısı" },
  en: { expires: "Valid until", instructor: "Instructor", credential: "Credential ID", verify: "Verify", verifyLink: "Verification link" },
} as const;

export function certificateLabels(language: "tr" | "en") {
  return labels[language];
}

/** "Issuer · 09/2026" — only present values, never an empty separator. */
export function certificatePrimaryMeta(item: PublicCertificate): string {
  return [item.issuer, formatCertificateDate(item.issuedAt)].filter(Boolean).join(" · ");
}

/** Secondary facts (instructor, expiry, credential id), each only when present. */
export function certificateSecondaryMeta(item: PublicCertificate, language: "tr" | "en"): string[] {
  const text = labels[language];
  const expires = formatCertificateDate(item.expiresAt);
  return [
    item.instructor ? `${text.instructor}: ${item.instructor}` : null,
    expires ? `${text.expires}: ${expires}` : null,
    item.credentialId ? `${text.credential}: ${item.credentialId}` : null,
  ].filter((value): value is string => Boolean(value));
}
