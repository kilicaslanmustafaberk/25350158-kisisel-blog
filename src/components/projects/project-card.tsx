import Image from "next/image";
import Link from "next/link";

import { SpineAnchor } from "@/components/motion/spine-lane";
import { imageDeliveryUrl } from "@/features/media/delivery-url";

type CardProject = {
  title: string; slug: string; shortDescription: string; status: string;
  skills: { name: string; slug: string }[];
  cover: { url: string; altText: string; width: number | null; height: number | null } | null;
};

/** `spineAnchor` (landing only) adds the decorative node where a Data Spine branch attaches. */
export function ProjectCard({ project, spineAnchor = false }: { project: CardProject; spineAnchor?: boolean }) {
  const status = ({ planned: "Planlandı", in_progress: "Devam ediyor", completed: "Tamamlandı", archived: "Arşivlendi" } as Record<string, string>)[project.status] ?? "Proje";
  return <article className="project-card" data-reveal={spineAnchor ? undefined : ""} data-spine-item={spineAnchor ? "" : undefined}>
    {spineAnchor && <SpineAnchor />}
    <Link className="project-preview" href={`/projects/${project.slug}`} aria-label={`${project.title} proje detayını aç`}>
      {project.cover ? <Image src={imageDeliveryUrl(project.cover.url)} alt={project.cover.altText} fill sizes="(max-width: 768px) 100vw, 50vw" /> : <div className="project-preview-fallback"><span>Proje önizlemesi</span><strong>{project.title.slice(0, 2).toUpperCase()}</strong></div>}
    </Link>
    <div className="project-card-body"><div className="project-card-meta"><span>{status}</span><span>{project.skills.map((skill) => skill.name).join(" · ") || "Bağımsız çalışma"}</span></div><h3><Link href={`/projects/${project.slug}`}>{project.title}</Link></h3><p>{project.shortDescription}</p><Link className="inline-link" href={`/projects/${project.slug}`}>Vaka çalışmasını incele <span aria-hidden="true">→</span></Link></div>
  </article>;
}
