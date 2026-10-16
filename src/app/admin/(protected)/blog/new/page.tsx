import type { Metadata } from "next";

import { PostForm } from "@/components/admin/post-form";
import { listCategories, listTags } from "@/server/blog/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Yeni Yazı — Admin", robots: { index: false, follow: false } };

export default async function NewPostPage() {
  await requireAdmin();
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">Blog CMS</p>
        <h1>Yeni yazı</h1>
        <p>İçeriği kaydettikten sonra cover görselini yükleyebilirsiniz.</p>
      </div>
      <PostForm categories={categories} tags={tags} />
    </section>
  );
}
