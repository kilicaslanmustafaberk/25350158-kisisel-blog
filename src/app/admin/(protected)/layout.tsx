import Link from "next/link";

import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAdmin } from "@/server/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <main className="site-container admin-workspace" id="main-content">
      <header className="admin-toolbar">
        <nav aria-label="Yönetim navigasyonu">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/projects">Projects</Link>
          <Link href="/admin/blog">Blog</Link>
          <Link href="/admin/profile">Profile</Link>
          <Link href="/admin/social">Social</Link>
          <Link href="/admin/education">Education</Link>
          <Link href="/admin/experience">Experience</Link>
          <Link href="/admin/certificates">Certificates</Link>
          <Link href="/admin/skills">Skills</Link>
          <Link href="/admin/cv">CV</Link>
        </nav>
        <div className="admin-account"><span>{session.user.email}</span><SignOutButton /></div>
      </header>
      {children}
    </main>
  );
}
