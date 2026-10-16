import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PageMotion } from "@/components/motion/page-motion";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { imageDeliveryUrl } from "@/features/media/delivery-url";
import { ArrowUpRightIcon, CodeIcon, LockIcon } from "@/components/ui/icons";
import { toSafeExternalUrl } from "@/features/navigation/safe-href";
import { buildCaseSections, formatProjectDate, parseTechnicalText, projectStatusLabel, type CaseSectionId } from "@/features/projects/case-study";
import { getPublicProject } from "@/server/projects/repository";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getPublicProject((await params).slug);
  if (!project) return { title: "Proje bulunamadı", robots: { index: false, follow: false } };
  return { title: project.title, description: project.shortDescription, openGraph: { title: project.title, description: project.shortDescription, images: project.cover ? [{ url: project.cover.url, alt: project.cover.altText }] : undefined } };
}

export default async function ProjectDetailPage({ params }: Props) {
  const project = await getPublicProject((await params).slug);
  if (!project) notFound();

  // The DTO already nulls repositoryUrl unless visibility is public (Phase 2 rule).
  const liveUrl = project.liveUrl ? toSafeExternalUrl(project.liveUrl) : null;
  const sourceUrl = project.repositoryVisibility === "public" && project.repositoryUrl ? toSafeExternalUrl(project.repositoryUrl) : null;
  const isPrivateRepository = project.repositoryVisibility === "private";
  const hasLinks = Boolean(liveUrl || sourceUrl || isPrivateRepository);
  const sections = buildCaseSections({ ...project, galleryCount: project.gallery.length, hasLinks });
  const has = (id: CaseSectionId) => sections.some((section) => section.id === id);

  return <main id="main-content"><PageMotion /><article className="case-study">
    <header className="site-container case-hero">
      <div className="case-hero-copy">
        <p className="eyebrow">Proje vaka çalışması</p>
        <h1>{project.title}</h1>
        <p className="case-lede">{project.shortDescription}</p>
        <dl className="case-meta">
          {project.role && <div><dt>Rol</dt><dd>{project.role}</dd></div>}
          {project.projectDate && <div><dt>Tarih</dt><dd><time dateTime={project.projectDate}>{formatProjectDate(project.projectDate)}</time></dd></div>}
          <div><dt>Durum</dt><dd><span className="status-dot" data-status={project.status} aria-hidden="true" />{projectStatusLabel(project.status)}</dd></div>
        </dl>
        {project.skills.length > 0 && <ul className="tech-chips" aria-label="Kullanılan teknolojiler">{project.skills.map((skill) => <li key={skill.slug}>{skill.name}</li>)}</ul>}
        {hasLinks && <div className="hero-actions case-actions">
          {liveUrl && <a className="button button-primary" href={liveUrl} target="_blank" rel="noopener noreferrer">Canlı projeyi aç<span className="sr-only"> (yeni sekmede açılır)</span> <ArrowUpRightIcon /></a>}
          {sourceUrl && <a className="button button-secondary" href={sourceUrl} target="_blank" rel="noopener noreferrer"><CodeIcon />Kaynak kod<span className="sr-only"> (yeni sekmede açılır)</span></a>}
          {isPrivateRepository && <span className="private-badge"><LockIcon />Özel depo</span>}
        </div>}
      </div>
      {project.cover ? <div className="case-cover"><Image src={imageDeliveryUrl(project.cover.url)} alt={project.cover.altText} fill priority sizes="(max-width: 1024px) 100vw, 50vw" /></div> : <div className="case-cover project-preview-fallback" aria-hidden="true"><span>Proje önizlemesi</span><strong>{project.title.slice(0, 2).toUpperCase()}</strong></div>}
    </header>

    <div className={`site-container case-layout${sections.length > 1 ? "" : " case-layout-single"}`}>
      {sections.length > 1 && <aside className="case-aside">
        <nav className="case-nav" aria-label="Vaka çalışması bölümleri">
          <p className="case-nav-title">Bu sayfada</p>
          <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.label}</a></li>)}</ol>
        </nav>
      </aside>}
      <div className="case-content">
        {has("overview") && <CaseSection id="overview" title="Genel bakış" text={project.detailedDescription!} />}
        {(has("problem") || has("solution")) && <div className="case-pair">
          {has("problem") && <CaseSection id="problem" title="Problem" text={project.problem!} />}
          {has("solution") && <CaseSection id="solution" title="Çözüm" text={project.solution!} />}
        </div>}
        {has("architecture") && <section className="case-section case-architecture" id="architecture" aria-labelledby="architecture-title" data-reveal>
          <h2 id="architecture-title">Mimari</h2>
          <div className="architecture-panel">
            <p className="architecture-label" aria-hidden="true">mimari notlar</p>
            <TechnicalText text={project.architectureDescription!} />
            {project.skills.length > 0 && <div className="architecture-stack">
              <h3>İlişkili teknolojiler</h3>
              <ul className="tech-chips">{project.skills.map((skill) => <li key={skill.slug}>{skill.name}</li>)}</ul>
            </div>}
          </div>
        </section>}
        {has("gallery") && <section className="case-section" id="gallery" aria-labelledby="gallery-title">
          <h2 id="gallery-title">Galeri</h2>
          <ProjectGallery images={project.gallery} projectTitle={project.title} />
        </section>}
        {has("links") && <section className="case-section" id="links" aria-labelledby="links-title">
          <h2 id="links-title">Bağlantılar</h2>
          <div className="external-links">
            {liveUrl && <a href={liveUrl} target="_blank" rel="noopener noreferrer">Canlı projeyi görüntüle<span className="sr-only"> (yeni sekmede açılır)</span> <span aria-hidden="true">↗</span></a>}
            {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Kaynak kodu görüntüle<span className="sr-only"> (yeni sekmede açılır)</span> <span aria-hidden="true">↗</span></a>}
            {isPrivateRepository && <span>Özel depo — kaynak kod paylaşılmıyor</span>}
          </div>
        </section>}
      </div>
    </div>
  </article></main>;
}

function TechnicalText({ text }: { text: string }) {
  return <>{parseTechnicalText(text).map((block, index) => block.type === "list"
    ? <ul key={index} className="case-list">{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>
    : <p key={index}>{block.text}</p>)}</>;
}

function CaseSection({ id, title, text }: { id: CaseSectionId; title: string; text: string }) {
  return <section className="case-section" id={id} aria-labelledby={`${id}-title`} data-reveal>
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="case-text"><TechnicalText text={text} /></div>
  </section>;
}
