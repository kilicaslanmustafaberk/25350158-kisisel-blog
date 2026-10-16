import { z } from "zod";

// Pure GitHub transformation layer (no network, no server-only import) so that
// validation, filtering and DTO narrowing can be unit-tested with fixtures.

export const GITHUB_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const GITHUB_REPOSITORY_LIMIT = 6;

export type GitHubRepositoryDTO = {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
};

export type GitHubProfileDTO = {
  username: string;
  name: string | null;
  profileUrl: string;
  publicRepoCount: number;
  repositories: GitHubRepositoryDTO[];
};

const githubHtmlUrl = z.url({ protocol: /^https$/, hostname: /^github\.com$/ });

// Only the fields the UI needs are read; unknown fields are stripped.
export const githubUserSchema = z.object({
  login: z.string().regex(GITHUB_USERNAME),
  name: z.string().max(255).nullable(),
  html_url: githubHtmlUrl,
  public_repos: z.number().int().nonnegative(),
  type: z.string(),
});

export const githubRepositorySchema = z.object({
  name: z.string().min(1).max(100),
  html_url: githubHtmlUrl,
  description: z.string().max(500).nullable(),
  fork: z.boolean(),
  archived: z.boolean(),
  private: z.boolean(),
  visibility: z.string().optional(),
  language: z.string().max(64).nullable(),
  stargazers_count: z.number().int().nonnegative(),
  pushed_at: z.string().nullable(),
});

export type GitHubRepositoryRaw = z.infer<typeof githubRepositorySchema>;

/** `https://github.com/<user>` → `<user>`; anything else (repo URLs, other hosts, http) → null. */
export function usernameFromGitHubUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["github.com", "www.github.com"].includes(url.hostname) || url.username || url.password) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1 || !GITHUB_USERNAME.test(segments[0])) return null;
    return segments[0];
  } catch {
    return null;
  }
}

/** Visible `social_links` GitHub entry wins; the server-only env value is the fallback. */
export function resolveGitHubUsername(links: { platform: string; url: string }[], envUsername: string | undefined): string | null {
  for (const link of links) {
    if (link.platform.toLowerCase() !== "github") continue;
    const username = usernameFromGitHubUrl(link.url);
    if (username) return username;
  }
  const fallback = envUsername?.trim();
  return fallback && GITHUB_USERNAME.test(fallback) ? fallback : null;
}

/** Lower-cased `owner/name` key used to compare API repos with CMS repository URLs. */
export function repositoryKey(value: string): string | null {
  try {
    const url = new URL(value);
    if (!["github.com", "www.github.com"].includes(url.hostname)) return null;
    const [owner, name] = url.pathname.split("/").filter(Boolean);
    if (!owner || !name) return null;
    return `${owner}/${name.replace(/\.git$/, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Public, original, active repositories ordered by the API's `pushed_at` order.
 * Forks and archived repos are excluded; anything not explicitly public is
 * excluded defensively; repos the CMS marks as private are never listed even if
 * GitHub reports them public. No popularity ranking is invented.
 */
export function selectPublicRepositories(raw: unknown[], options: { excludeKeys?: Set<string>; limit?: number } = {}): GitHubRepositoryDTO[] {
  const limit = options.limit ?? GITHUB_REPOSITORY_LIMIT;
  const result: GitHubRepositoryDTO[] = [];
  for (const candidate of raw) {
    const parsed = githubRepositorySchema.safeParse(candidate);
    if (!parsed.success) continue;
    const repo = parsed.data;
    if (repo.private || (repo.visibility && repo.visibility !== "public") || repo.fork || repo.archived || !repo.pushed_at) continue;
    const key = repositoryKey(repo.html_url);
    if (key && options.excludeKeys?.has(key)) continue;
    result.push({ name: repo.name, url: repo.html_url, description: repo.description, language: repo.language, stars: repo.stargazers_count, pushedAt: repo.pushed_at });
    if (result.length >= limit) break;
  }
  return result;
}

export function toGitHubProfileDTO(rawUser: unknown, rawRepositories: unknown, options: { excludeKeys?: Set<string>; limit?: number } = {}): GitHubProfileDTO | null {
  const user = githubUserSchema.safeParse(rawUser);
  if (!user.success || !Array.isArray(rawRepositories)) return null;
  return {
    username: user.data.login,
    name: user.data.name,
    profileUrl: user.data.html_url,
    publicRepoCount: user.data.public_repos,
    repositories: selectPublicRepositories(rawRepositories, options),
  };
}
