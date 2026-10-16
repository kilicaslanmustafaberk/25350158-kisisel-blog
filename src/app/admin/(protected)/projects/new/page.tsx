import type { Metadata } from "next";

import { ProjectForm } from "@/components/admin/project-form";
import { listSkills } from "@/server/projects/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Yeni Proje — Admin", robots: { index: false, follow: false } };

export default async function NewProjectPage() {
  await requireAdmin();
  const skills = await listSkills();
  return <section className="admin-page"><div className="admin-page-heading"><p className="eyebrow">Project CMS</p><h1>Yeni proje</h1><p>İçeriği kaydettikten sonra cover ve galeri yükleyebilirsiniz.</p></div><ProjectForm skills={skills} /></section>;
}
