import "server-only";

import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "node:path";
import { cvContactParts, displayExternalUrl } from "@/features/cv/contact";

import { formatCvDateRange, sectionLabels } from "@/features/cv/date-format";
import { renderableSections } from "@/features/cv/section-visibility";
import type { CvSectionId } from "@/features/cv/validation";
import type { PublicCvData } from "@/server/cv/repository";
import { certificateLabels, certificatePrimaryMeta, certificateSecondaryMeta } from "@/features/certificates/display";

/**
 * ATS-first PDF template: single column, A4, local Noto Sans Unicode font,
 * no graphics/icons/photos/skill-bars. All
 * content is rendered as real text nodes — see docs/DECISIONS.md ADR-029/032 and
 * docs/SECURITY.md "PDF content policy".
 */
Font.register({ family: "NotoSans", fonts: [
  { src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
  { src: path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
] });
Font.registerHyphenationCallback((word) => [word]);

/*
 * Pagination rules (react-pdf legacy paginator, @react-pdf/layout 5.x) — see ADR-094:
 * - Sections are emitted as flat, page-level blocks. Keep-together and `minPresenceAhead`
 *   decisions only work between siblings of one container; a section wrapped in a single View
 *   could neither keep its heading with the first entry nor stop entry text splitting alone.
 * - A block that fits is still pushed to the next page when its marginBottom overflows, so
 *   vertical rhythm uses marginTop only (this moved a fitting section wholesale to page 2).
 * - Heading + first entry form one unbreakable block (no orphaned headings); every further
 *   entry is its own unbreakable block, so a long section flows across pages entry by entry.
 * - Entries with very long descriptions (limits allow 2 000 chars) keep only their
 *   title/organization/date together and let the description split, instead of leaving a
 *   large gap at the bottom of the page.
 */
const KEEP_TOGETHER_MAX_CHARS = 600;
const TWO_BODY_LINES = 30;

const styles = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 34, paddingHorizontal: 42, fontFamily: "NotoSans", fontSize: 10, color: "#18212a", lineHeight: 1.45 },
  name: { fontWeight: 700, fontSize: 22, lineHeight: 1.4, marginBottom: 10 },
  headline: { fontSize: 11.5, lineHeight: 1.5, marginBottom: 10, color: "#374151" },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8, fontSize: 9, color: "#374151" },
  sectionStart: { marginTop: 12 },
  sectionHeading: { fontWeight: 700, fontSize: 11.5, marginBottom: 5, paddingBottom: 3, borderBottomWidth: .5, borderBottomColor: "#bdc5ce" },
  entry: { marginTop: 6 },
  entryHeadRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  entryTitle: { fontWeight: 700, fontSize: 10.5, flexShrink: 1, paddingRight: 10 },
  entryDate: { fontSize: 9.5, color: "#333333" },
  entrySubtitle: { fontSize: 10, marginBottom: 2, color: "#222222" },
  entryDescription: { fontSize: 10, color: "#222222" },
  certificateMeta: { fontSize: 9.5, color: "#333333" },
  skillItem: { fontSize: 10, marginBottom: 3 },
  link: { color: "#111111", textDecoration: "underline" },
});

type SectionProps = { data: PublicCvData; label: string };
/** `keep`: the block's content is unbreakable. `render(first)` returns page-level nodes. */
type Block = { key: string; keep: boolean; render: (first: boolean) => React.ReactElement[] };

/** Heading + first block are one unbreakable unit; later blocks flow on their own. */
function Section({ label, blocks }: { label: string; blocks: Block[] }) {
  const [first, ...rest] = blocks;
  if (!first) return null;
  const heading = <Text style={styles.sectionHeading}>{label}</Text>;
  const start = first.keep
    ? <View key="start" style={styles.sectionStart} wrap={false}>{heading}{first.render(true)}</View>
    : <View key="start" style={styles.sectionStart} wrap={false} minPresenceAhead={TWO_BODY_LINES}>{heading}</View>;
  return (
    <>
      {start}
      {first.keep ? null : first.render(true)}
      {rest.flatMap((block) => block.render(false))}
    </>
  );
}

/** Short entries are one unbreakable View; a very long description may split after its head. */
function entryBlock(key: string, head: React.ReactElement, description: string | null | undefined): Block {
  const long = (description?.length ?? 0) > KEEP_TOGETHER_MAX_CHARS;
  const body = description ? <Text style={styles.entryDescription}>{description}</Text> : null;
  return {
    key,
    keep: !long,
    render: (first) => {
      const style = first ? undefined : styles.entry;
      if (!long) return [<View key={key} style={style} wrap={false}>{head}{body}</View>];
      return [
        <View key={`${key}-head`} style={style} wrap={false} minPresenceAhead={TWO_BODY_LINES}>{head}</View>,
        <Text key={`${key}-description`} style={styles.entryDescription}>{description}</Text>,
      ];
    },
  };
}

function SummarySection({ data, label }: SectionProps) {
  const summary = data.summary.trim();
  return <Section label={label} blocks={[{ key: "summary", keep: false, render: () => [<Text key="summary">{summary}</Text>] }]} />;
}

function SkillsSection({ data, label }: SectionProps) {
  const grouped = new Map<string, string[]>();
  for (const skill of data.skills) grouped.set(skill.category, [...(grouped.get(skill.category) ?? []), skill.name]);
  const blocks: Block[] = [...grouped.entries()].map(([category, names]) => ({
    key: category,
    keep: true,
    render: () => [
      <Text key={category} style={styles.skillItem}>
        <Text style={{ fontWeight: 700 }}>{category}: </Text>
        {names.join(", ")}
      </Text>,
    ],
  }));
  return <Section label={label} blocks={blocks} />;
}

function ProjectsSection({ data, label }: SectionProps) {
  const blocks = data.projects.map((project) => entryBlock(project.id, (
    <>
      <Text style={styles.entryTitle}>{project.title}</Text>
      <Text style={styles.entryDescription}>{project.shortDescription}</Text>
      {project.skills.length > 0 && <Text style={styles.entrySubtitle}>{project.skills.map((skill) => skill.name).join(", ")}</Text>}
    </>
  ), null));
  return <Section label={label} blocks={blocks} />;
}

function ExperienceSection({ data, label }: SectionProps) {
  const blocks = data.experience.map((item) => entryBlock(item.id, (
    <>
      <View style={styles.entryHeadRow}>
        <Text style={styles.entryTitle}>{item.position}</Text>
        <Text style={styles.entryDate}>{formatCvDateRange(item.startDate, item.endDate, item.isCurrent, data.language)}</Text>
      </View>
      <Text style={styles.entrySubtitle}>{item.organization}</Text>
    </>
  ), item.description));
  return <Section label={label} blocks={blocks} />;
}

function EducationSection({ data, label }: SectionProps) {
  const blocks = data.education.map((item) => entryBlock(item.id, (
    <>
      <View style={styles.entryHeadRow}>
        <Text style={styles.entryTitle}>{item.institution}</Text>
        <Text style={styles.entryDate}>{formatCvDateRange(item.startDate, item.endDate, item.isCurrent, data.language)}</Text>
      </View>
      {item.program && <Text style={styles.entrySubtitle}>{item.program}</Text>}
    </>
  ), item.description));
  return <Section label={label} blocks={blocks} />;
}

/**
 * Phase 18: text-only entries; a short "Doğrulama bağlantısı" link instead of a raw long URL.
 * Secondary facts and the link share one line so several certificates stay compact.
 */
function CertificatesSection({ data, label }: SectionProps) {
  const text = certificateLabels(data.language);
  const blocks = data.certificates.map((item) => {
    const primary = certificatePrimaryMeta(item);
    const secondary = certificateSecondaryMeta(item, data.language).join(" · ");
    const link = item.credentialUrl ? <Link src={item.credentialUrl} style={styles.link}>{text.verifyLink}</Link> : null;
    return entryBlock(item.id, (
      <>
        <Text style={styles.entryTitle}>{item.title}</Text>
        {primary ? <Text style={styles.entryDescription}>{primary}</Text> : null}
        {secondary || link ? (
          <Text style={styles.certificateMeta}>
            {secondary}
            {secondary && link ? " · " : null}
            {link}
          </Text>
        ) : null}
      </>
    ), item.description);
  });
  return <Section label={label} blocks={blocks} />;
}

const sectionRenderers: Record<CvSectionId, (props: SectionProps) => React.ReactElement> = {
  summary: SummarySection,
  skills: SkillsSection,
  projects: ProjectsSection,
  experience: ExperienceSection,
  education: EducationSection,
  certificates: CertificatesSection,
};

export function CvPdfDocument({ data }: { data: PublicCvData }) {
  const labels = sectionLabels[data.language];
  const contactParts = cvContactParts(data.profile);

  return (
    <Document title={`${data.profile.fullName} — ${data.title}`} author={data.profile.fullName} subject={data.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.profile.fullName}</Text>
        <Text style={styles.headline}>{data.profile.headline}</Text>
        {contactParts.length > 0 && (
          <View style={styles.contactRow}>
            <Text>{contactParts.join("  |  ")}</Text>
          </View>
        )}
        {data.socialLinks.length > 0 && (
          <View style={styles.contactRow}>
            {data.socialLinks.map((link) => (
              <Link key={link.id} src={link.url} style={styles.link}>
                {displayExternalUrl(link.url)}
              </Link>
            ))}
          </View>
        )}
        {renderableSections(data).map((id) => {
          const Renderer = sectionRenderers[id];
          return <Renderer key={id} data={data} label={labels[id]} />;
        })}
      </Page>
    </Document>
  );
}
