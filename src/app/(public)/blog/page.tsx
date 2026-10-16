import type { Metadata } from "next";

import { PostCard } from "@/components/blog/post-card";
import { PageMotion } from "@/components/motion/page-motion";
import { SecondarySpine } from "@/components/motion/secondary-spine";
import { listPublicPosts } from "@/server/blog/repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog", description: "Teknik konular, kararlar ve öğrenilenler üzerine yazılar." };

export default async function BlogPage() {
  const posts = await listPublicPosts();
  return (
    <main id="main-content" className="has-secondary-spine">
      <SecondarySpine variant="blog" />
      <PageMotion />
      <section className="site-container public-page-heading">
        <p className="eyebrow">Yazılar</p>
        <h1>Blog</h1>
        <p>Teknik kararlar, mimari notlar ve üretim sürecinden öğrenilenler.</p>
      </section>
      <section className="site-container projects-grid" aria-label="Yayınlanmış blog yazıları">
        {posts.length ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="empty-state public-empty">
            <h2>Yazılar hazırlanıyor</h2>
            <p>Yayınlanmış blog yazıları burada görünecek.</p>
          </div>
        )}
      </section>
    </main>
  );
}
