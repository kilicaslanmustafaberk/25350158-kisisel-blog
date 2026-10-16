// Phase 7 project case-study helpers. They only reshape stored text; no
// architecture node, flow or technology relation is invented.

export type CaseSectionId = "overview" | "problem" | "solution" | "architecture" | "gallery" | "links";
export type CaseSectionLink = { id: CaseSectionId; label: string };

type CaseSource = {
  detailedDescription: string | null;
  problem: string | null;
  solution: string | null;
  architectureDescription: string | null;
  galleryCount: number;
  hasLinks: boolean;
};

const hasText = (value: string | null) => Boolean(value && value.trim());

/** Section navigation containing only sections that will actually render. */
export function buildCaseSections(source: CaseSource): CaseSectionLink[] {
  const sections: CaseSectionLink[] = [];
  if (hasText(source.detailedDescription)) sections.push({ id: "overview", label: "Genel bakış" });
  if (hasText(source.problem)) sections.push({ id: "problem", label: "Problem" });
  if (hasText(source.solution)) sections.push({ id: "solution", label: "Çözüm" });
  if (hasText(source.architectureDescription)) sections.push({ id: "architecture", label: "Mimari" });
  if (source.galleryCount > 0) sections.push({ id: "gallery", label: "Galeri" });
  if (source.hasLinks) sections.push({ id: "links", label: "Bağlantılar" });
  return sections;
}

export type TextBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };

const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;

/**
 * Splits plain text into paragraphs (blank-line separated) and lists (lines that
 * start with -, *, • or "1."). Output is rendered as React text nodes, never HTML.
 */
export function parseTechnicalText(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const chunk of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((line) => line.trimEnd()).filter((line) => line.trim());
    if (!lines.length) continue;
    let paragraph: string[] = [];
    let list: string[] = [];
    const flushParagraph = () => { if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n").trim() }); paragraph = []; };
    const flushList = () => { if (list.length) blocks.push({ type: "list", items: list }); list = []; };
    for (const line of lines) {
      const match = LIST_ITEM.exec(line);
      if (match) { flushParagraph(); list.push(match[1].trim()); } else { flushList(); paragraph.push(line.trim()); }
    }
    flushParagraph();
    flushList();
  }
  return blocks;
}

const statusLabels: Record<string, string> = {
  planned: "Planlandı",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
  archived: "Arşivlendi",
};

export function projectStatusLabel(status: string) {
  return statusLabels[status] ?? status.replace(/_/g, " ");
}

/** `2026-04` → `Nisan 2026`, `2026-04-12` → `12 Nisan 2026`; unknown formats are returned unchanged. */
export function formatProjectDate(value: string) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day ?? 1)));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", { year: "numeric", month: "long", ...(day ? { day: "numeric" } : {}), timeZone: "UTC" }).format(date);
}
