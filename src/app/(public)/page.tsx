import Link from "next/link";
import "./narrative.css";

import { PostCard } from "@/components/blog/post-card";
import { GitHubSection } from "@/components/github/github-section";
import { DataSpine } from "@/components/motion/data-spine";
import { PageMotion } from "@/components/motion/page-motion";
import { NarrativeController } from "@/components/motion/narrative-controller";
import { SpineAnchor, SpineLane } from "@/components/motion/spine-lane";
import { phoneHref } from "@/features/cv/contact";
import { ProjectCard } from "@/components/projects/project-card";
import { SkillUniverse } from "@/components/three/skill-universe";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { resolveGitHubUsername } from "@/features/github/profile";
import { toSafeExternalUrl } from "@/features/navigation/safe-href";
import { buildCareerTimeline } from "@/features/timeline/build-timeline";
import { listPublicPosts } from "@/server/blog/repository";
import { getPublicCvData, getPublicSiteIdentity } from "@/server/cv/repository";
import { getGitHubPublicProfile } from "@/server/github/repository";
import { listPrivateRepositoryUrls, listPublicProjects, listPublicSkillUniverse } from "@/server/projects/repository";
import { listPublicCertificates } from "@/server/certificates/repository";
import { LANDING_CERTIFICATE_LIMIT, certificatePrimaryMeta, certificateSecondaryMeta } from "@/features/certificates/display";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, latestPosts, cvData, skills, identity, privateRepositoryUrls, allCertificates] = await Promise.all([
    listPublicProjects({ featured: true, limit: 3 }),
    listPublicPosts({ limit: 3 }),
    getPublicCvData(),
    listPublicSkillUniverse(),
    getPublicSiteIdentity(),
    listPrivateRepositoryUrls(),
    listPublicCertificates(),
  ]);
  // Phase 18: visible certificates only (SQL-filtered); a short deterministic slice keeps the pinned sequence brief.
  const certificates = allCertificates.slice(0, LANDING_CERTIFICATE_LIMIT);
  const moreCertificates = allCertificates.length - certificates.length;
  // GitHub is an optional enhancement: username from visible social_links or the
  // server-only GITHUB_USERNAME; API failures resolve to null (link-only fallback).
  const githubUsername = resolveGitHubUsername(identity?.socialLinks ?? [], process.env.GITHUB_USERNAME);
  const github = githubUsername ? await getGitHubPublicProfile(githubUsername, privateRepositoryUrls) : null;
  const contactLinks = (identity?.socialLinks ?? []).flatMap((link) => {
    const url = toSafeExternalUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });
  const timeline = buildCareerTimeline({
    education: cvData?.education ?? [],
    experience: cvData?.experience ?? [],
  });
  const name = cvData?.profile.fullName ?? "Berk";
  const headline = cvData?.profile.headline ?? "Sistem odaklı dijital ürünler ve belgelenebilir mühendislik.";
  const summary = identity?.shortBio ?? "Projelerim, yazılarım ve kariyer geçmişim.";
  const chapters = [
    { id: "hero", label: "Başlangıç", cue: "ANA SAYFA" },
    ...(identity?.longBio?.trim() ? [{ id: "about", label: "Yaklaşım", cue: "YAKLAŞIM" }] : []),
    { id: "projects", label: "Üretim", cue: "PROJELER" },
    ...(skills.length ? [{ id: "skills", label: "Sistem", cue: "SİSTEM" }] : []),
    ...(timeline.length ? [{ id: "journey", label: "Yolculuk", cue: "EĞİTİM & DENEYİM" }] : []),
    ...(certificates.length ? [{ id: "certificates", label: "Sertifikalar", cue: "SERTİFİKALAR" }] : []),
    { id: "blog", label: "Notlar", cue: "BLOG" },
    ...(cvData ? [{ id: "cv", label: "Özgeçmiş", cue: "ÖZGEÇMİŞ" }] : []),
    ...(githubUsername ? [{ id: "github", label: "Açık kaynak", cue: "GITHUB" }] : []),
    { id: "contact", label: "Bağlantı", cue: "İLETİŞİM" },
  ];
  // "02 // PROJELER": chapter numbers follow the sections that actually render.
  const cueText = (id: string) => {
    const index = chapters.findIndex(chapter => chapter.id === id);
    return `${String(index + 1).padStart(2, "0")} // ${chapters[index]?.cue ?? ""}`;
  };
  const cue = (id: string) => <span className="chapter-cue" aria-hidden="true">{cueText(id)}</span>;

  // Phase 14: every section is a lane of ONE page-wide Data Spine (<DataSpine> draws it).
  // Sections only declare where the route passes (SpineLane) and what hangs off it (SpineAnchor).
  return <main id="main-content" className="landing-page">
    <NarrativeController />
    <DataSpine />
    <PageMotion landing />
    <nav className="narrative-index" aria-label="Sayfa bölümleri"><span className="narrative-index-track" aria-hidden="true"><span /></span>{chapters.map(chapter => <a key={chapter.id} href={`#${chapter.id}`} aria-label={chapter.label}><span>{chapter.label}</span><i aria-hidden="true" /></a>)}</nav>
    <section id="hero" className="hero-shell spine-section" aria-labelledby="hero-title" data-spine-section>
      <div className="site-container spine-grid hero-grid">
        <div className="spine-col spine-col--left hero-copy">
          <p className="eyebrow" data-hero-reveal>Fikirden çalışan sisteme</p>
          <h1 id="hero-title" data-hero-reveal><span>{name}</span>{headline}</h1>
          <p className="hero-summary" data-hero-reveal>{summary}</p>
          <div className="hero-actions" data-hero-reveal>
            <Link className="button button-primary" href="/projects">Projeleri incele <ArrowUpRightIcon /></Link>
            <a className="button button-secondary" href="/api/cv/pdf" target="_blank" rel="noopener">CV&apos;yi görüntüle<span className="sr-only"> (PDF, yeni sekmede açılır)</span></a>
          </div>
        </div>
        <SpineLane id="hero" />
        <div className="spine-col spine-col--right hero-aside" data-hero-reveal><div className="hero-aside-inner"><SpineAnchor />{cue("hero")}</div></div>
      </div>
      <div className="site-container hero-index"><a className="hero-continue" href={`#${chapters[1].id}`}><span className="hero-continue-label">KEŞFETMEYE DEVAM ET</span> <span className="hero-continue-arrow" aria-hidden="true">↓</span></a><button type="button" className="motion-toggle" aria-pressed="false">Hareketi azalt</button></div>
    </section>

    {identity?.longBio?.trim() && <section className="spine-section about-section" id="about" aria-labelledby="about-title" data-spine-section>
      <div className="site-container spine-grid">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("about")}<p className="eyebrow">Hakkımda</p><h2 id="about-title">Biraz daha yakından</h2></div>
        <SpineLane id="about" />
        <div className="spine-col spine-col--right" data-reveal><div className="about-panel"><SpineAnchor /><p className="about-content">{identity.longBio}</p></div></div>
      </div>
    </section>}

    <section className="spine-section featured-projects" id="projects" aria-labelledby="featured-title" data-spine-section data-spine-sequence="">
      <div className="site-container spine-grid" data-pin-scene="">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("projects")}<p className="eyebrow">Seçili çalışmalar</p><h2 id="featured-title">Fikirler, çalışan sistemlere dönüşür.</h2><p>Problem, çözüm ve mimari kararlarıyla belgelenen çalışmalar.</p><Link className="inline-link" href="/projects">Tüm projeler <span aria-hidden="true">→</span></Link></div>
        <SpineLane id="projects" />
        <div className="spine-col spine-col--right">
          {featured.length ? <div className="projects-grid">{featured.map((project) => <ProjectCard key={project.id} project={project} spineAnchor />)}</div> : <div className="empty-state public-empty" data-spine-item=""><SpineAnchor /><h3>Seçki hazırlanıyor</h3><p>Yayınlanan ve öne çıkarılan projeler burada yer alacak.</p></div>}
        </div>
      </div>
    </section>

    {skills.length > 0 && <section className="spine-section skill-section" id="skills" aria-labelledby="skills-title" data-spine-section>
      <div className="site-container spine-grid">
        <div className="spine-col spine-col--left" data-reveal><div className="skill-panel"><SpineAnchor /><SkillUniverse skills={skills} /></div></div>
        <SpineLane id="skills" />
        <div className="spine-col spine-col--right section-heading" data-reveal>{cue("skills")}<p className="eyebrow">Skill Universe</p><h2 id="skills-title">Her sistem, bağlantılarıyla güçlü.</h2><p>Çalışmalarımda kullandığım teknolojiler ve uzmanlık alanları.</p></div>
      </div>
    </section>}

    {timeline.length > 0 && <section className="spine-section timeline-section" id="journey" aria-labelledby="timeline-title" data-spine-section data-spine-sequence="">
      <div className="site-container spine-grid" data-pin-scene="">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("journey")}<p className="eyebrow">Kariyer yolculuğu</p><h2 id="timeline-title">Eğitim &amp; Deneyim</h2><p>Her adım, bir sonraki için temel.</p></div>
        <SpineLane id="journey" calm />
        <div className="spine-col spine-col--right">
          <div className="career-timeline">
            <span className="timeline-track" aria-hidden="true" />
            <ol>{timeline.map((event) => <li key={event.id} data-spine-item="">
              <SpineAnchor tick />
              <time dateTime={event.date}>{event.year}</time>
              <article><span className="timeline-type">{event.type === "education" ? "Eğitim" : "Deneyim"}</span><h3>{event.title}</h3>{event.subtitle && <p className="timeline-subtitle">{event.subtitle}</p>}{event.description && <p>{event.description}</p>}</article>
            </li>)}</ol>
          </div>
        </div>
      </div>
    </section>}

    {certificates.length > 0 && <section className="spine-section certificates-section" id="certificates" aria-labelledby="certificates-title" data-spine-section data-spine-sequence="">
      <div className="site-container spine-grid" data-pin-scene="">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("certificates")}<p className="eyebrow">Sertifikalar</p><h2 id="certificates-title">Öğrenmeye devam ederken kazandıklarım.</h2><p>Tamamladığım eğitimler ve doğrulanabilir sertifikalar.</p>{moreCertificates > 0 && (cvData?.certificates.length ?? 0) > 0 && <Link className="inline-link" href="/cv#certificates">Tümü özgeçmişte <span aria-hidden="true">→</span></Link>}</div>
        <SpineLane id="certificates" />
        <div className="spine-col spine-col--right">
          <ol className="certificate-list" aria-label="Sertifikalar">{certificates.map((item) => {
            const primary = certificatePrimaryMeta(item);
            const secondary = certificateSecondaryMeta(item, "tr");
            return <li key={item.id} data-spine-item="">
              <SpineAnchor />
              <article className="certificate-card">
                <h3>{item.title}</h3>
                {primary && <p className="certificate-meta">{primary}</p>}
                {secondary.length > 0 && <p className="certificate-detail">{secondary.join(" · ")}</p>}
                {item.credentialUrl && <a className="certificate-verify" href={item.credentialUrl} target="_blank" rel="noopener noreferrer">Doğrula <span aria-hidden="true">↗</span><span className="sr-only"> (yeni sekmede açılır)</span></a>}
              </article>
            </li>;
          })}</ol>
        </div>
      </div>
    </section>}

    <section className="spine-section featured-projects blog-section" id="blog" aria-labelledby="latest-posts-title" data-spine-section data-spine-sequence="">
      <div className="site-container spine-grid" data-pin-scene="">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("blog")}<p className="eyebrow">Notlar</p><h2 id="latest-posts-title">Son yazılar</h2><p>Teknik kararlar ve çalışma sürecinden notlar.</p><Link className="button button-secondary" href="/blog">Tüm yazılar <span aria-hidden="true">→</span></Link></div>
        <SpineLane id="blog" />
        <div className="spine-col spine-col--right">
          <div className="posts-rail">
            {latestPosts.length ? <div className="projects-grid">{latestPosts.map((post) => <PostCard key={post.id} post={post} spineAnchor />)}</div> : <div className="empty-state public-empty" data-spine-item=""><SpineAnchor /><h3>Yazılar hazırlanıyor</h3><p>Yayınlanan blog yazıları burada yer alacak.</p></div>}
          </div>
        </div>
      </div>
    </section>

    {cvData && <section className="spine-section cv-teaser" id="cv" aria-labelledby="cv-teaser-title" data-spine-section data-spine-sequence="">
      <div className="site-container spine-grid" data-pin-scene="">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("cv")}<p className="eyebrow">Özgeçmiş</p><h2 id="cv-teaser-title">Deneyim ve yeteneklerim bir arada</h2><p>Özgeçmişimi PDF olarak açabilir ya da web sürümünde inceleyebilirsiniz.</p></div>
        <SpineLane id="cv" />
        <div className="spine-col spine-col--right"><div className="cv-panel" data-spine-item=""><SpineAnchor /><div className="hero-actions"><a className="button button-primary" href="/api/cv/pdf" target="_blank" rel="noopener">CV&apos;yi görüntüle<span className="sr-only"> (PDF, yeni sekmede açılır)</span></a><Link className="button button-secondary" href="/cv">Web CV</Link></div></div></div>
      </div>
    </section>}
    {githubUsername && <GitHubSection profile={github} profileUrl={github?.profileUrl ?? `https://github.com/${githubUsername}`} username={githubUsername} cue={cueText("github")} />}

    <section className="spine-section contact-section" id="contact" aria-labelledby="contact-title" data-spine-section data-spine-sequence="">
      <div className="site-container spine-grid" data-pin-scene="">
        <div className="spine-col spine-col--left section-heading" data-reveal>{cue("contact")}<p className="eyebrow">İletişim</p><h2 id="contact-title">Yeni bir fikir üzerine konuşalım.</h2><p className="contact-note">{cvData?.profile.availableForWork ? "Bir proje, iş fırsatı ya da teknik bir konu için yazabilirsin. En hızlı yanıtı e-postayla veriyorum." : "Bir proje, iş birliği ya da teknik bir konu için aşağıdaki kanallardan ulaşabilirsin."}</p></div>
        <SpineLane id="contact" />
        <div className="spine-col spine-col--right">
          <div className="contact-panel">
            <ul className="contact-links" aria-label="İletişim kanalları">
              {cvData?.profile.email && <li data-spine-item=""><SpineAnchor tick /><a href={`mailto:${cvData.profile.email}`}><span><small>E-posta</small>{cvData.profile.email}</span><span aria-hidden="true">↗</span></a></li>}
              {identity?.phone && phoneHref(identity.phone) && <li data-spine-item=""><SpineAnchor tick /><a href={phoneHref(identity.phone)!}><span><small>Telefon</small>{identity.phone}</span><span aria-hidden="true">↗</span></a></li>}
              {contactLinks.map((link) => <li key={link.url} data-spine-item=""><SpineAnchor tick /><a href={link.url} rel="noopener noreferrer" target="_blank"><span>{link.label}<span className="sr-only"> (yeni sekmede açılır)</span></span><span aria-hidden="true">↗</span></a></li>)}
              {cvData && <li data-spine-item=""><SpineAnchor tick /><a href="/api/cv/pdf" target="_blank" rel="noopener"><span><small>Özgeçmiş</small>CV (PDF)<span className="sr-only"> (yeni sekmede açılır)</span></span><span aria-hidden="true">↗</span></a></li>}
              {!cvData && <li data-spine-item=""><SpineAnchor tick /><Link href="/cv"><span><small>Profil</small>Profil ve iletişim bilgileri</span><span aria-hidden="true">→</span></Link></li>}
            </ul>
          </div>
        </div>
      </div>
    </section>
  </main>;
}
