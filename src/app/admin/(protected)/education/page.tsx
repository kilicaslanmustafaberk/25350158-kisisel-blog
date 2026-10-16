import type { Metadata } from "next";

import { EducationManager } from "@/components/admin/education-manager";
import { listEducation } from "@/server/cv/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Eğitim — Admin", robots: { index: false, follow: false } };

export default async function AdminEducationPage() {
  await requireAdmin();
  const items = await listEducation();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">CV</p>
        <h1>Eğitim</h1>
        <p>Eğitim kayıtlarını ekleyin, düzenleyin, sıralayın veya kaldırın.</p>
      </div>
      <EducationManager
        items={items.map((item) => ({
          id: item.id,
          institution: item.institution,
          program: item.program,
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
