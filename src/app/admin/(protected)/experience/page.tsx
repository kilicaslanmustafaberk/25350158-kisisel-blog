import type { Metadata } from "next";

import { ExperienceManager } from "@/components/admin/experience-manager";
import { listExperiences } from "@/server/cv/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Deneyim — Admin", robots: { index: false, follow: false } };

export default async function AdminExperiencePage() {
  await requireAdmin();
  const items = await listExperiences();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">CV</p>
        <h1>Deneyim</h1>
        <p>Deneyim kayıtlarını ekleyin, düzenleyin, sıralayın veya kaldırın.</p>
      </div>
      <ExperienceManager
        items={items.map((item) => ({
          id: item.id,
          organization: item.organization,
          position: item.position,
          startDate: item.startDate,
          endDate: item.endDate,
          isCurrent: item.isCurrent,
          description: item.description,
          isVisible: item.isVisible,
        }))}
      />
    </section>
  );
}
