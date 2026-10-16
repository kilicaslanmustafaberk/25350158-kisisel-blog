import type { PublicCommandData } from "@/features/command-palette/commands";
import { contentPath, toSafeDestination } from "@/features/navigation/safe-href";

// The terminal is NOT a shell. Input is only ever used as a lookup key into the
// fixed registry below; it is never evaluated, interpolated into a URL, sent to
// the server or persisted. Output is plain text plus allowlisted links.

export type TerminalLine = { text: string; href?: string; external?: boolean; tone?: "muted" | "error" };
export type TerminalResult = { kind: "output"; lines: TerminalLine[] } | { kind: "clear" };

type CommandDefinition = { description: string; run: (data: PublicCommandData) => TerminalLine[] };

function link(text: string, href: string, external = false): TerminalLine {
  const safe = toSafeDestination(href, external);
  return safe ? { text, href: safe.href, external: safe.external } : { text };
}

const empty = (text: string): TerminalLine[] => [{ text, tone: "muted" }];

export const terminalCommands: Record<string, CommandDefinition> = {
  help: {
    description: "Kullanılabilir komutları listeler",
    run: () => Object.entries(terminalCommands).map(([name, command]) => ({ text: `${name.padEnd(9)} ${command.description}` })),
  },
  about: {
    description: "Kısa profil",
    run: (data) => {
      const lines: TerminalLine[] = [];
      if (data.name) lines.push({ text: data.name });
      if (data.headline) lines.push({ text: data.headline, tone: "muted" });
      if (data.summary) lines.push({ text: data.summary });
      return lines.length ? lines : empty("Profil bilgisi henüz yayınlanmadı.");
    },
  },
  projects: {
    description: "Yayınlanmış projeler",
    run: (data) => {
      const lines = data.projects.flatMap((project) => {
        const href = contentPath("/projects", project.slug);
        return href ? [link(project.title, href)] : [];
      });
      return lines.length ? [...lines, { text: `${lines.length} proje`, tone: "muted" }] : empty("Yayınlanmış proje yok.");
    },
  },
  skills: {
    description: "Görünür yetenekler",
    run: (data) => {
      if (!data.skills.length) return empty("Görünür yetenek yok.");
      const groups = new Map<string, string[]>();
      for (const skill of data.skills) groups.set(skill.category, [...(groups.get(skill.category) ?? []), skill.name]);
      return [...groups.entries()].map(([category, names]) => ({ text: `${category}: ${names.join(", ")}` }));
    },
  },
  blog: {
    description: "Son yazılar",
    run: (data) => {
      const lines = data.posts.flatMap((post) => {
        const href = contentPath("/blog", post.slug);
        return href ? [link(post.title, href)] : [];
      });
      return [...(lines.length ? lines : empty("Yayınlanmış yazı yok.")), link("Tüm yazılar: /blog", "/blog")];
    },
  },
  cv: {
    description: "CV (PDF) ve Web CV",
    run: (data) => data.cvAvailable
      ? [link("CV (PDF): /api/cv/pdf", "/api/cv/pdf"), link("Web CV: /cv", "/cv")]
      : empty("CV henüz yayınlanmadı."),
  },
  contact: {
    description: "İletişim kanalları",
    run: (data) => {
      const lines: TerminalLine[] = [];
      if (data.email) lines.push({ text: `E-posta: ${data.email}` });
      for (const item of data.links) lines.push(link(`${item.label}: ${item.url}`, item.url, true));
      return lines.length ? lines : [link("İletişim bölümü: /#contact", "/#contact")];
    },
  },
  github: {
    description: "GitHub profili",
    run: (data) => data.githubUrl ? [link(data.githubUrl, data.githubUrl, true)] : empty("GitHub profili yapılandırılmadı."),
  },
  clear: { description: "Ekranı temizler", run: () => [] },
};

export const MAX_TERMINAL_INPUT = 64;

export function runTerminalCommand(input: string, data: PublicCommandData): TerminalResult {
  const name = input.trim().toLowerCase().slice(0, MAX_TERMINAL_INPUT);
  if (!name) return { kind: "output", lines: [] };
  if (name === "clear") return { kind: "clear" };
  // Own-property lookup only: `constructor`, `__proto__` etc. are not commands.
  const command = Object.hasOwn(terminalCommands, name) ? terminalCommands[name] : undefined;
  if (!command) return { kind: "output", lines: [{ text: `Komut bulunamadı: ${name}. Liste için "help" yazın.`, tone: "error" }] };
  return { kind: "output", lines: command.run(data) };
}
