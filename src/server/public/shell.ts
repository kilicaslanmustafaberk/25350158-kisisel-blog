import "server-only";

import type { PublicCommandData } from "@/features/command-palette/commands";
import { resolveGitHubUsername } from "@/features/github/profile";
import { toSafeExternalUrl } from "@/features/navigation/safe-href";
import { listPublicPosts } from "@/server/blog/repository";
import { getPublicSiteIdentity } from "@/server/cv/repository";
import { listPublicProjectIndex, listPublicSkillIndex } from "@/server/projects/repository";

export type PublicShellData = { command: PublicCommandData; footer: { name: string } };

const fallbackName = "Berk";

function githubProfileUrl(links: { platform: string; url: string }[], cvOnly = false) {
  const username = resolveGitHubUsername(links, cvOnly ? undefined : process.env.GITHUB_USERNAME);
  return username ? `https://github.com/${username}` : null;
}

/**
 * Public shell data for the command palette, terminal and footer name. Built only from
 * public repositories (published projects/posts, visible skills/links, visible
 * email). The shell degrades to static routes if the database is unavailable.
 */
export async function getPublicShellData(cvOnly = false): Promise<PublicShellData> {
  try {
    const [identity, projects, posts, skills] = await Promise.all([
      getPublicSiteIdentity(cvOnly),
      listPublicProjectIndex(),
      listPublicPosts({ limit: 8 }),
      listPublicSkillIndex(),
    ]);
    const links = (identity?.socialLinks ?? []).filter((link) => toSafeExternalUrl(link.url));
    const githubUrl = githubProfileUrl(links, cvOnly);
    const name = identity?.fullName ?? fallbackName;
    return {
      command: {
        name: identity?.fullName ?? null,
        headline: identity?.headline ?? null,
        summary: identity?.summary ?? null,
        email: identity?.email ?? null,
        cvAvailable: Boolean(identity),
        projects,
        posts: posts.map((post) => ({ title: post.title, slug: post.slug })),
        skills,
        links: links.map((link) => ({ label: link.label, platform: link.platform, url: link.url })),
        githubUrl,
      },
      footer: { name },
    };
  } catch (error) {
    console.warn("[public-shell] falling back to static navigation", error instanceof Error ? error.name : "unknown");
    const githubUrl = githubProfileUrl([], cvOnly);
    return {
      command: { name: null, headline: null, summary: null, email: null, cvAvailable: false, projects: [], posts: [], skills: [], links: [], githubUrl },
      footer: { name: fallbackName },
    };
  }
}
