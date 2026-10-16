import type { Metadata } from "next";
import Link from "next/link";

import { DeletePostButton, PostStateButton } from "@/components/admin/post-list-actions";
import { listAdminPosts } from "@/server/blog/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Blog — Admin", robots: { index: false, follow: false } };

export default async function AdminBlogPage() {
  await requireAdmin();
  const items = await listAdminPosts();
  return (
    <section className="admin-page" aria-labelledby="blog-title">
      <div className="admin-page-heading admin-heading-row">
        <div>
          <p className="eyebrow">Blog CMS</p>
          <h1 id="blog-title">Yazılar</h1>
          <p>Blog yazılarını, kategorileri ve yayın durumunu yönetin.</p>
        </div>
        <div className="table-actions">
          <Link className="button button-secondary" href="/admin/blog/categories">
            Kategoriler
          </Link>
          <Link className="button button-primary" href="/admin/blog/new">
            Yeni yazı
          </Link>
        </div>
      </div>
      {!items.length ? (
        <div className="empty-state">
          <h2>Henüz yazı yok</h2>
          <p>İlk blog yazısını oluşturarak başlayın.</p>
          <Link className="button button-primary" href="/admin/blog/new">
            Yazı oluştur
          </Link>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Yazı</th>
                <th>Kategori</th>
                <th>Durum</th>
                <th>Yayın tarihi</th>
                <th>Güncellendi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>/{item.slug}</small>
                  </td>
                  <td>{item.categoryName ?? "—"}</td>
                  <td>{item.status === "published" ? "Yayında" : "Taslak"}</td>
                  <td>{item.publishedAt ? item.publishedAt.toLocaleDateString("tr-TR") : "—"}</td>
                  <td>{item.updatedAt.toLocaleDateString("tr-TR")}</td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/admin/blog/${item.id}/edit`}>Düzenle</Link>
                      <PostStateButton id={item.id} nextStatus={item.status === "published" ? "draft" : "published"}>
                        {item.status === "published" ? "Yayından kaldır" : "Yayınla"}
                      </PostStateButton>
                      <DeletePostButton id={item.id} title={item.title} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
