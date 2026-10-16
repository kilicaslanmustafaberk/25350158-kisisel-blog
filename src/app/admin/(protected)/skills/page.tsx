import type { Metadata } from "next";

import { SkillManager } from "@/components/admin/skill-manager";
import { listSkillsAdmin } from "@/server/cv/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Yetenekler — Admin", robots: { index: false, follow: false } };

export default async function AdminSkillsPage() {
  await requireAdmin();
  const items = await listSkillsAdmin();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">CV</p>
        <h1>Yetenekler</h1>
        <p>Portfolio projelerinde ve CV&apos;de kullanılan tek yetenek kataloğu.</p>
      </div>
      <SkillManager
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          category: item.category,
          description: item.description,
          isVisible: item.isVisible,
        }))}
      />
    </section>
  );
}
