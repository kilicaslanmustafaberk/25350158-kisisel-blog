import "server-only";

import { unstable_cache } from "next/cache";

import {
  GITHUB_REPOSITORY_LIMIT,
  repositoryKey,
  toGitHubProfileDTO,
  type GitHubProfileDTO,
} from "@/features/github/profile";

// GitHub public profile integration (Phase 7).
// - Server-side only: the browser never calls api.github.com, so CSP connect-src stays 'self'.
// - GITHUB_TOKEN is optional and server-only (never NEXT_PUBLIC_); it only raises the rate limit.
// - Results are cached for GITHUB_REVALIDATE_SECONDS with unstable_cache because the
//   landing route is force-dynamic, which forces every plain fetch() to no-store.
// - Any failure returns null so the landing page renders a plain profile link instead.

const API_BASE = "https://api.github.com";
const API_VERSION = "2026-03-10";
export const GITHUB_REVALIDATE_SECONDS = 21600; // 6 hours — see DECISIONS.md ADR-064
const REQUEST_TIMEOUT_MS = 4000;
const FAILURE_BACKOFF_MS = 10 * 60 * 1000;
const SNAPSHOT_REPOSITORY_LIMIT = 30;

const recentFailures = new Map<string, number>();

async function githubGet(path: string): Promise<unknown> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const response = await fetch(`${API_BASE}${path}`, {
    cache: "no-store", // the cached layer is unstable_cache below
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    redirect: "error",
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "blogproje-portfolio",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GITHUB_HTTP_${response.status}`);
  return response.json();
}

// Throws on failure so that failures are never written into the cache.
const loadSnapshot = unstable_cache(
  async (username: string): Promise<GitHubProfileDTO> => {
    const encoded = encodeURIComponent(username);
    const [user, repositories] = await Promise.all([
      githubGet(`/users/${encoded}`),
      githubGet(`/users/${encoded}/repos?type=owner&sort=pushed&direction=desc&per_page=${SNAPSHOT_REPOSITORY_LIMIT}`),
    ]);
    const dto = toGitHubProfileDTO(user, repositories, { limit: SNAPSHOT_REPOSITORY_LIMIT });
    if (!dto || dto.username.toLowerCase() !== username.toLowerCase()) throw new Error("GITHUB_INVALID_RESPONSE");
    return dto;
  },
  ["github-public-profile-v1"],
  { revalidate: GITHUB_REVALIDATE_SECONDS, tags: ["github-profile"] },
);

export async function getGitHubPublicProfile(username: string, privateRepositoryUrls: string[] = []): Promise<GitHubProfileDTO | null> {
  const failedAt = recentFailures.get(username);
  if (failedAt && Date.now() - failedAt < FAILURE_BACKOFF_MS) return null;
  try {
    const snapshot = await loadSnapshot(username);
    recentFailures.delete(username);
    const excluded = new Set(privateRepositoryUrls.flatMap((url) => repositoryKey(url) ?? []));
    return {
      ...snapshot,
      repositories: snapshot.repositories.filter((repo) => !excluded.has(repositoryKey(repo.url) ?? "")).slice(0, GITHUB_REPOSITORY_LIMIT),
    };
  } catch (error) {
    recentFailures.set(username, Date.now());
    console.warn("[github] public profile unavailable", error instanceof Error ? error.message : "unknown");
    return null;
  }
}
