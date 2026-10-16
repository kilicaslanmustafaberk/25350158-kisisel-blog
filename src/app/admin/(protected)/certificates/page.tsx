import type { Metadata } from "next";

import { CertificateManager } from "@/components/admin/certificate-manager";
import { listCertificatesAdmin } from "@/server/certificates/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Sertifikalar — Admin", robots: { index: false, follow: false } };

export default async function AdminCertificatesPage() {
  await requireAdmin();
  const items = await listCertificatesAdmin();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">Kariyer</p>
        <h1>Sertifikalar</h1>
        <p>Landing sayfasındaki Sertifikalar bölümü ile Web/PDF CV&apos;yi besler. Yalnız sertifika adı zorunludur; boş bırakılan alanlar sitede hiç görünmez.</p>
      </div>
      <CertificateManager items={items} />
    </section>
  );
}
