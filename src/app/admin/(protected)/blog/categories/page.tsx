import type { Metadata } from "next";

import { CategoryManager } from "@/components/admin/category-manager";
import { listCategories } from "@/server/blog/repository";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Blog Kategorileri — Admin", robots: { index: false, follow: false } };

export default async function AdminBlogCategoriesPage() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">Blog CMS</p>
        <h1>Kategoriler</h1>
        <p>Yazıları sınıflandırmak için kullanılan kategorileri yönetin.</p>
      </div>
      <CategoryManager categories={categories} />
    </section>
  );
}
