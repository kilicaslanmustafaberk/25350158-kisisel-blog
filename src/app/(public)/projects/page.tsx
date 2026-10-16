import type { Metadata } from "next";

import { PageMotion } from "@/components/motion/page-motion";
import { SecondarySpine } from "@/components/motion/secondary-spine";
import { ProjectCard } from "@/components/projects/project-card";
import { listPublicProjects } from "@/server/projects/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projeler", description: "Problem, çözüm ve teknik mimariyle sunulan proje vaka çalışmaları." };

export default async function ProjectsPage() {
  const projects = await listPublicProjects();
  return <main id="main-content" className="has-secondary-spine"><SecondarySpine variant="projects" /><PageMotion /><section className="site-container public-page-heading"><p className="eyebrow">Proje vitrini</p><h1>Projeler</h1><p>Yalnız sonuçları değil; problemi, verilen kararları ve uygulanan teknik yaklaşımı anlatan vaka çalışmaları.</p></section><section className="site-container projects-grid" aria-label="Yayınlanmış projeler">{projects.length ? projects.map((project) => <ProjectCard key={project.id} project={project} />) : <div className="empty-state public-empty"><h2>Proje arşivi hazırlanıyor</h2><p>Yayınlanmış vaka çalışmaları burada görünecek.</p></div>}</section></main>;
}
