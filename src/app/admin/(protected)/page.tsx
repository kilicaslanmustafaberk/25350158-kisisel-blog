import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Admin Dashboard", robots: { index: false, follow: false } };

export default async function AdminPage() {
  await requireAdmin();
  return (
    <section className="admin-page" aria-labelledby="admin-title">
      <div className="admin-page-heading">
        <p className="eyebrow">Korumalı alan</p>
        <h1 id="admin-title">İçerik yönetimi</h1>
        <p>Proje vaka çalışmalarını, yayın durumunu ve görselleri tek alandan yönetin.</p>
      </div>
      <Link className="admin-module" href="/admin/projects">
        <span><strong>Projects</strong><small>CRUD, yayın, skill ve medya yönetimi</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/blog">
        <span><strong>Blog</strong><small>Tiptap editör, kategori/etiket, cover ve yayın yönetimi</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/profile">
        <span><strong>Profile</strong><small>Ad, unvan, biyografi ve iletişim görünürlüğü</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/education">
        <span><strong>Education</strong><small>Eğitim geçmişi CRUD ve sıralama</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/experience">
        <span><strong>Experience</strong><small>Deneyim CRUD ve sıralama</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/certificates">
        <span><strong>Certificates</strong><small>Sertifika CRUD, site/CV görünürlüğü ve sıralama</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/skills">
        <span><strong>Skills</strong><small>Yetenek kataloğu ve görünürlük</small></span>
        <span aria-hidden="true">→</span>
      </Link>
      <Link className="admin-module" href="/admin/cv">
        <span><strong>CV</strong><small>Bölüm sırası, dil, ATS uyumluluk kontrolü, PDF</small></span>
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
