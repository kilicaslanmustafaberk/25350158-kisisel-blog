import type { Metadata } from "next";

import { SocialLinkManager } from "@/components/admin/social-link-manager";
import { getProfile, listSocialLinksAdmin } from "@/server/cv/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Sosyal Bağlantılar — Admin", robots: { index: false, follow: false } };

export default async function AdminSocialPage() {
  await requireAdmin();
  const [profile, items] = await Promise.all([getProfile(), listSocialLinksAdmin()]);
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">Profil</p>
        <h1>Sosyal bağlantılar</h1>
        <p>Footer, iletişim bölümü, CV ve komut paletinde kullanılan public profil bağlantıları. Yalnız https adresleri kabul edilir.</p>
      </div>
      {profile ? <SocialLinkManager items={items} /> : <div className="empty-state"><h2>Önce profil oluşturun</h2><p>Sosyal bağlantılar profil kaydına bağlıdır. Profil sayfasından temel bilgileri kaydedin.</p></div>}
    </section>
  );
}
