import type { Metadata } from "next";
import Link from "next/link";

import { formatCvDateRange, miscLabels, sectionLabels } from "@/features/cv/date-format";
import { renderableSections } from "@/features/cv/section-visibility";
import { displayExternalUrl, phoneHref } from "@/features/cv/contact";
import type { CvSectionId } from "@/features/cv/validation";
import { getPublicCvData, type PublicCvData } from "@/server/cv/repository";
import { SecondarySpine } from "@/components/motion/secondary-spine";
import { certificateLabels, certificatePrimaryMeta, certificateSecondaryMeta } from "@/features/certificates/display";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicCvData();
  if (!data) return { title: "CV", robots: { index: false, follow: false } };
  return {
    title: `${data.profile.fullName} — ${data.title}`,
    description: data.summary.slice(0, 160),
  };
}

function SummarySection({ data, label }: { data: PublicCvData; label: string }) {
  return (
    <section className="cv-section" aria-labelledby="cv-summary">
      <h2 id="cv-summary">{label}</h2>
      <p>{data.summary}</p>
    </section>
  );
}

function SkillsSection({ data, label }: { data: PublicCvData; label: string }) {
  const grouped = new Map<string, string[]>();
  for (const skill of data.skills) grouped.set(skill.category, [...(grouped.get(skill.category) ?? []), skill.name]);
  return (
    <section className="cv-section" aria-labelledby="cv-skills">
      <h2 id="cv-skills">{label}</h2>
      <dl className="cv-skill-groups">
        {[...grouped.entries()].map(([category, names]) => (
          <div key={category}>
            <dt>{category}</dt>
            <dd>{names.join(", ")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProjectsSection({ data, label }: { data: PublicCvData; label: string }) {
  return (
    <section className="cv-section" aria-labelledby="cv-projects">
      <h2 id="cv-projects">{label}</h2>
      <ul className="cv-entry-list">
        {data.projects.map((project) => (
          <li key={project.id}>
            <div className="cv-entry-head">
              <strong>
                <Link href={`/projects/${project.slug}`}>{project.title}</Link>
              </strong>
            </div>
            <p>{project.shortDescription}</p>
            {project.skills.length > 0 && <p className="cv-entry-meta">{project.skills.map((skill) => skill.name).join(", ")}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExperienceSection({ data, label }: { data: PublicCvData; label: string }) {
  return (
    <section className="cv-section" aria-labelledby="cv-experience">
      <h2 id="cv-experience">{label}</h2>
      <ul className="cv-entry-list">
        {data.experience.map((item) => (
          <li key={item.id}>
            <div className="cv-entry-head">
              <strong>{item.position}</strong>
              <time>{formatCvDateRange(item.startDate, item.endDate, item.isCurrent, data.language)}</time>
            </div>
            <p className="cv-entry-meta">{item.organization}</p>
            {item.description && <p>{item.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EducationSection({ data, label }: { data: PublicCvData; label: string }) {
  return (
    <section className="cv-section" aria-labelledby="cv-education">
      <h2 id="cv-education">{label}</h2>
      <ul className="cv-entry-list">
        {data.education.map((item) => (
          <li key={item.id}>
            <div className="cv-entry-head">
              <strong>{item.institution}</strong>
              <time>{formatCvDateRange(item.startDate, item.endDate, item.isCurrent, data.language)}</time>
            </div>
            {item.program && <p className="cv-entry-meta">{item.program}</p>}
            {item.description && <p>{item.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CertificatesSection({ data, label }: { data: PublicCvData; label: string }) {
  const text = certificateLabels(data.language);
  return (
    <section className="cv-section" id="certificates" aria-labelledby="cv-certificates">
      <h2 id="cv-certificates">{label}</h2>
      <ul className="cv-entry-list">
        {data.certificates.map((item) => {
          const primary = certificatePrimaryMeta(item);
          const secondary = certificateSecondaryMeta(item, data.language);
          return (
            <li key={item.id}>
              <div className="cv-entry-head">
                <strong>{item.title}</strong>
              </div>
              {primary && <p className="cv-entry-meta">{primary}</p>}
              {secondary.length > 0 && <p className="cv-entry-meta">{secondary.join(" · ")}</p>}
              {item.description && <p>{item.description}</p>}
              {item.credentialUrl && (
                <p className="cv-entry-meta">
                  <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer">
                    {text.verifyLink}<span className="sr-only"> (yeni sekmede açılır)</span>
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const sectionRenderers: Record<CvSectionId, (props: { data: PublicCvData; label: string }) => React.ReactElement> = {
  summary: SummarySection,
  skills: SkillsSection,
  projects: ProjectsSection,
  experience: ExperienceSection,
  education: EducationSection,
  certificates: CertificatesSection,
};

export default async function CvPage() {
  const data = await getPublicCvData();

  if (!data) {
    return (
      <main id="main-content" className="has-secondary-spine">
        <SecondarySpine variant="cv" />
        <section className="site-container public-page-heading">
          <p className="eyebrow">CV</p>
          <h1>CV hazırlanıyor</h1>
          <p>Bu bölüm henüz yayınlanmadı.</p>
        </section>
      </main>
    );
  }

  const labels = sectionLabels[data.language];
  const misc = miscLabels[data.language];

  return (
    <main id="main-content" className="has-secondary-spine">
      <SecondarySpine variant="cv" />
      <article className="site-container cv-page">
        <header className="cv-header">
          <p className="eyebrow">CV</p>
          <h1>{data.profile.fullName}</h1>
          <p className="cv-headline">{data.profile.headline}</p>
          <div className="cv-contact">
            {data.profile.email && <span>{misc.email}: {data.profile.email}</span>}
            {data.profile.phone && <a href={phoneHref(data.profile.phone)!}>{data.profile.phone}</a>}
            {data.profile.location && <span>{misc.location}: {data.profile.location}</span>}
            {data.profile.availableForWork && <span>{misc.availableForWork}</span>}
          </div>
          {data.socialLinks.length > 0 && (
            <ul className="cv-links">
              {data.socialLinks.map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {displayExternalUrl(link.url)}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="cv-actions">
            <a className="button button-primary" href="/api/cv/pdf?download=1">
              {misc.downloadPdf}
            </a>
          </div>
        </header>

        {renderableSections(data).map((id) => {
          const Section = sectionRenderers[id];
          return <Section key={id} data={data} label={labels[id]} />;
        })}
      </article>
    </main>
  );
}
