import type { Metadata } from "next";
import Link from "next/link";

import { DeleteProjectButton, ProjectStateButton } from "@/components/admin/project-list-actions";
import { listAdminProjects } from "@/server/projects/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Projeler — Admin", robots: { index: false, follow: false } };

export default async function AdminProjectsPage() {
  await requireAdmin();
  const items = await listAdminProjects();
  return (
    <section className="admin-page" aria-labelledby="projects-title">
      <div className="admin-page-heading admin-heading-row">
        <div><p className="eyebrow">Project CMS</p><h1 id="projects-title">Projeler</h1><p>Vaka çalışmalarını ve yayın durumunu yönetin.</p></div>
        <Link className="button button-primary" href="/admin/projects/new">Yeni proje</Link>
      </div>
      {!items.length ? (
        <div className="empty-state"><h2>Henüz proje yok</h2><p>İlk vaka çalışmasını oluşturarak başlayın.</p><Link className="button button-primary" href="/admin/projects/new">Proje oluştur</Link></div>
      ) : (
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Proje</th><th>Durum</th><th>Yayın</th><th>İşlemler</th></tr></thead><tbody>
          {items.map((item) => <tr key={item.id}>
            <td><strong>{item.title}</strong><small>/{item.slug}</small></td>
            <td>{item.status.replace("_", " ")}{item.featured ? " · featured" : ""}{item.includeInCv ? " · CV" : ""}</td>
            <td>{item.published ? "Yayında" : "Taslak"}</td>
            <td><div className="table-actions"><Link href={`/admin/projects/${item.id}/edit`}>Düzenle</Link><ProjectStateButton id={item.id} field="published" value={!item.published}>{item.published ? "Yayından kaldır" : "Yayınla"}</ProjectStateButton><ProjectStateButton id={item.id} field="featured" value={!item.featured}>{item.featured ? "Öne çıkarmayı kaldır" : "Öne çıkar"}</ProjectStateButton><ProjectStateButton id={item.id} field="includeInCv" value={!item.includeInCv}>{item.includeInCv ? "CV'den kaldır" : "CV'ye ekle"}</ProjectStateButton><DeleteProjectButton id={item.id} title={item.title} /></div></td>
          </tr>)}
        </tbody></table></div>
      )}
    </section>
  );
}
