import { contentPath, toSafeDestination } from "@/features/navigation/safe-href";

// Minimal public data handed to the client for the command palette and the
// terminal. It is built on the server from already-public DTOs only.
export type PublicCommandData = {
  name: string | null;
  headline: string | null;
  summary: string | null;
  email: string | null;
  cvAvailable: boolean;
  projects: { title: string; slug: string; shortDescription: string }[];
  posts: { title: string; slug: string }[];
  skills: { name: string; category: string }[];
  links: { label: string; platform: string; url: string }[];
  githubUrl: string | null;
};

export type CommandGroup = "Sayfalar" | "Projeler" | "Yazılar" | "Bağlantılar" | "Araçlar";

export type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  keywords: string[];
  group: CommandGroup;
  /** Either a navigation target or a built-in action; never both. */
  href?: string;
  external?: boolean;
  action?: "open-terminal";
};

export const commandGroupOrder: CommandGroup[] = ["Sayfalar", "Projeler", "Yazılar", "Bağlantılar", "Araçlar"];

function page(id: string, label: string, href: string, keywords: string[], hint?: string): CommandItem {
  return { id, label, href, keywords, group: "Sayfalar", hint };
}

export function buildCommandIndex(data: PublicCommandData): CommandItem[] {
  const items: CommandItem[] = [
    page("page-home", "Ana sayfa", "/", ["home", "anasayfa", "start"]),
    page("page-projects", "Projeler", "/projects", ["projects", "portfolio", "case study", "vaka"]),
    page("page-blog", "Blog", "/blog", ["blog", "articles", "yazılar", "posts"]),
    page("page-cv", "Web CV", "/cv", ["cv", "web cv", "resume", "özgeçmiş"]),
    page("page-skills", "Yetenekler", "/#skills", ["skills", "stack", "teknoloji"], "Ana sayfa bölümü"),
    page("page-journey", "Kariyer zaman çizgisi", "/#journey", ["journey", "timeline", "experience", "eğitim", "deneyim"], "Ana sayfa bölümü"),
    page("page-contact", "İletişim", "/#contact", ["contact", "email", "mail", "iletişim"], "Ana sayfa bölümü"),
  ];

  for (const project of data.projects) {
    const href = contentPath("/projects", project.slug);
    if (href) items.push({ id: `project-${project.slug}`, label: project.title, hint: project.shortDescription, href, keywords: ["project", "proje", project.slug], group: "Projeler" });
  }
  for (const post of data.posts) {
    const href = contentPath("/blog", post.slug);
    if (href) items.push({ id: `post-${post.slug}`, label: post.title, href, keywords: ["blog", "yazı", "article", post.slug], group: "Yazılar" });
  }

  if (data.cvAvailable) items.push({ id: "link-cv-pdf", label: "CV'yi aç (PDF)", href: "/api/cv/pdf", keywords: ["cv", "pdf", "özgeçmiş", "download", "indir", "resume"], group: "Bağlantılar" });
  if (data.githubUrl) items.push({ id: "link-github", label: "GitHub profili", href: data.githubUrl, external: true, keywords: ["github", "source", "code", "repo"], group: "Bağlantılar" });
  for (const link of data.links) {
    if (link.platform.toLowerCase() === "github" && data.githubUrl) continue;
    items.push({ id: `link-${link.platform}-${link.label}`.toLowerCase(), label: link.label, href: link.url, external: true, keywords: [link.platform], group: "Bağlantılar" });
  }

  items.push({ id: "tool-terminal", label: "Terminali aç", hint: "Küçük geliştirici konsolu", action: "open-terminal", keywords: ["terminal", "console", "shell", "cli"], group: "Araçlar" });

  // Final allowlist gate: anything that is not a safe internal path or an HTTPS
  // URL is dropped instead of being rendered as a link.
  return items.filter((item) => {
    if (item.action) return true;
    if (!item.href) return false;
    const safe = toSafeDestination(item.href, Boolean(item.external));
    if (!safe) return false;
    item.href = safe.href;
    return true;
  });
}

export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

/** Simple name / keyword / group matching. Every query token must match somewhere. */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return items;
  const scored: { item: CommandItem; score: number; index: number }[] = [];
  items.forEach((item, index) => {
    const label = normalizeSearchText(item.label);
    const haystack = [label, normalizeSearchText(item.group), ...item.keywords.map(normalizeSearchText)].join(" ");
    if (!tokens.every((token) => haystack.includes(token))) return;
    const score = label.startsWith(tokens[0]) ? 0 : label.includes(tokens[0]) ? 1 : 2;
    scored.push({ item, score, index });
  });
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map((entry) => entry.item);
}
