import type { Metadata } from "next";
import Link from "next/link";

import { AtsReport } from "@/components/admin/ats-report";
import { CvPdfManager } from "@/components/admin/cv-pdf-manager";
import { CvSettingsForm } from "@/components/admin/cv-settings-form";
import { calculateAtsScore, evaluateAtsRules } from "@/features/cv/ats-rules";
import { getCvSettings, getPublicCvData } from "@/server/cv/repository";
import { getUploadedCvAdminState } from "@/server/cv/uploaded-pdf";
import { requireAdmin } from "@/server/require-admin";
import { isR2Configured } from "@/server/storage/r2-env";

export const metadata: Metadata = { title: "CV Ayarları — Admin", robots: { index: false, follow: false } };

export default async function AdminCvPage() {
  await requireAdmin();
  const [settings, cvData, uploadState] = await Promise.all([getCvSettings(), getPublicCvData(), getUploadedCvAdminState()]);

  return (
    <section className="admin-page">
      <div className="admin-page-heading admin-heading-row">
        <div>
          <p className="eyebrow">CV</p>
          <h1>CV Ayarları</h1>
          <p>
            Ziyaretçilere sunulan profesyonel CV PDF&apos;ini yönetin. Web CV ve yedek PDF için bölüm sırası, görünürlük, dil ve
            özet override&apos;ı ayarlayın; ardından ATS uyumluluğunu kontrol edin.
          </p>
        </div>
        {cvData && (
          <div className="table-actions">
            <Link className="button button-secondary" href="/cv" target="_blank">
              Web CV&apos;yi görüntüle
            </Link>
          </div>
        )}
      </div>
      <CvPdfManager
        active={uploadState.active ? { originalName: uploadState.active.originalName, size: uploadState.active.size, uploadedAt: uploadState.active.uploadedAt?.toISOString() ?? null } : null}
        storageConfigured={isR2Configured()}
        schemaReady={uploadState.schemaReady}
      />
      <CvSettingsForm
        initial={{
          title: settings.title,
          summaryOverride: settings.summaryOverride,
          language: settings.language,
          sectionVisibility: settings.sectionVisibility,
          sectionOrder: settings.sectionOrder,
          maxProjects: settings.maxProjects,
        }}
      />
      {cvData ? (
        <AtsReport results={evaluateAtsRules(cvData)} score={calculateAtsScore(evaluateAtsRules(cvData))} />
      ) : (
        <div className="empty-state">
          <h2>ATS kontrolü için önce profil gerekli</h2>
          <p>
            ATS uyum kontrolü ve public CV, <Link href="/admin/profile">Profil</Link> sayfasında en az temel bilgiler kaydedilmeden
            çalıştırılamaz.
          </p>
        </div>
      )}
    </section>
  );
}
