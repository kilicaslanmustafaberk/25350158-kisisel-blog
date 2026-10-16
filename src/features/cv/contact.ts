import { z } from "zod";

export function normalizePhone(value: string): string | null {
  const text = value.trim();
  if (!/^[+\d ()-]+$/.test(text) || text.length > 40) return null;
  const compact = text.replace(/[ ()-]/g, "");
  return /^\+?\d{7,15}$/.test(compact) ? compact : null;
}

export const phoneInputSchema = z.string().trim().max(40).refine(
  (value) => !value || normalizePhone(value) !== null,
  "Telefon 7–15 rakam içermeli; +, boşluk, parantez ve tire kullanılabilir.",
).transform((value) => value || null);

export function phoneHref(phone: string | null | undefined): string | null {
  const normalized = phone ? normalizePhone(phone) : null;
  return normalized ? `tel:${normalized}` : null;
}

export function displayExternalUrl(url: string): string {
  const withoutProtocol = url.replace(/^https?:\/\//i, "");
  try {
    return decodeURI(withoutProtocol);
  } catch {
    return withoutProtocol;
  }
}

export function cvContactParts(profile: { email: string | null; phone?: string | null; location: string | null }): string[] {
  return [profile.email, profile.phone, profile.location].filter((value): value is string => Boolean(value?.trim()));
}

export function displayOptionalText(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  return /^[-–—\s]*$/.test(text) ? "" : text;
}

export function cvSummary(override: string | null, longBio: string | null): string {
  return displayOptionalText(override) || displayOptionalText(longBio);
}
