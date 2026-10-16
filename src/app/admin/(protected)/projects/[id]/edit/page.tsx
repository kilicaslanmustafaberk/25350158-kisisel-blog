import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/admin/project-form";
import { ProjectMediaManager } from "@/components/admin/project-media-manager";
import { getAdminProject, getAdminProjectImages, listSkills } from "@/server/projects/repository";
import { isR2Configured } from "@/server/storage/r2-env";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Proje Düzenle — Admin", robots: { index: false, follow: false } };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [project, skills, images] = await Promise.all([getAdminProject(id), listSkills(), getAdminProjectImages(id)]);
  if (!project) notFound();
  return <section className="admin-page"><div className="admin-page-heading"><p className="eyebrow">Project CMS</p><h1>{project.title}</h1><p>İçerik, yayın ve medya ilişkilerini yönetin.</p></div><ProjectForm initial={project} skills={skills} /><ProjectMediaManager projectId={project.id} images={images} storageConfigured={isR2Configured()} /></section>;
}
