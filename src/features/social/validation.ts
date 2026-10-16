import { z } from "zod";

import { usernameFromGitHubUrl } from "@/features/github/profile";

// Phase 8 social link CMS validation. Public profile links are HTTPS-only: the
// Phase 7 `javascript:` finding must not be reproducible through the admin UI.

export const socialPlatformValues = ["github", "linkedin", "instagram", "x", "youtube", "website", "medium", "behance", "dribbble", "gitlab", "stackoverflow", "other"] as const;
export type SocialPlatform = (typeof socialPlatformValues)[number];

export const socialPlatformLabels: Record<SocialPlatform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  behance: "Behance",
  dribbble: "Dribbble",
  x: "X / Twitter",
  gitlab: "GitLab",
  stackoverflow: "Stack Overflow",
  medium: "Medium",
  youtube: "YouTube",
  website: "Web sitesi",
  other: "Diğer",
};

/** Parses and normalizes a public profile URL; anything but credential-free https is rejected. */
export function normalizeSocialUrl(value: string): string | null {
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return null;
  return url.toString();
}

export const socialLinkInputSchema = z
  .object({
    platform: z.enum(socialPlatformValues),
    label: z.string().trim().min(1).max(60),
    url: z.string().trim().min(1).max(300),
    isVisible: z.boolean(),
    showInCv: z.boolean().optional(),
  })
  .transform((value, ctx) => {
    const url = normalizeSocialUrl(value.url);
    if (!url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Yalnız https:// ile başlayan geçerli bir adres kabul edilir." });
      return z.NEVER;
    }
    // A GitHub entry drives the landing GitHub section, so it must be a profile URL.
    if (value.platform === "github" && !usernameFromGitHubUrl(url)) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "GitHub bağlantısı https://github.com/<kullanıcı-adı> biçiminde olmalıdır." });
      return z.NEVER;
    }
    return { ...value, url, showInCv: value.showInCv ?? defaultShowInCv(value.platform) };
  });

export type SocialLinkInput = z.infer<typeof socialLinkInputSchema>;

export function defaultShowInCv(platform: string): boolean {
  return ["github", "linkedin", "website"].includes(platform);
}
