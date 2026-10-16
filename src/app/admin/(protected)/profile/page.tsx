import type { Metadata } from "next";

import { ProfileForm } from "@/components/admin/profile-form";
import { getProfile } from "@/server/cv/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Profil — Admin", robots: { index: false, follow: false } };

export default async function AdminProfilePage() {
  await requireAdmin();
  const profile = await getProfile();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">CV</p>
        <h1>Profil</h1>
        <p>Web CV, PDF ve landing sayfasının kullandığı tek profil veri kaynağı.</p>
      </div>
      <ProfileForm initial={profile ?? {}} />
    </section>
  );
}
