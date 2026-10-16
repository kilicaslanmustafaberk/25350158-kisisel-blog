import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostCoverManager } from "@/components/admin/post-cover-manager";
import { PostForm } from "@/components/admin/post-form";
import { getAdminPost, listCategories, listTags } from "@/server/blog/repository";
import { isR2Configured } from "@/server/storage/r2-env";
import { requireAdmin } from "@/server/require-admin";

export const metadata: Metadata = { title: "Yazı Düzenle — Admin", robots: { index: false, follow: false } };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [post, categories, tags] = await Promise.all([getAdminPost(id), listCategories(), listTags()]);
  if (!post) notFound();
  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <p className="eyebrow">Blog CMS</p>
        <h1>{post.title}</h1>
        <p>İçerik, sınıflandırma, yayın ve cover görselini yönetin.</p>
      </div>
      <PostForm
        initial={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          categoryId: post.categoryId,
          tagIds: post.tagIds,
          status: post.status,
          publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
        }}
        categories={categories}
        tags={tags}
      />
      <PostCoverManager postId={post.id} cover={post.cover} storageConfigured={isR2Configured()} />
    </section>
  );
}
