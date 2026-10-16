import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { renderPostContent } from "@/features/blog/render-content";
import { imageDeliveryUrl } from "@/features/media/delivery-url";
import { getPublicPost } from "@/server/blog/repository";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublicPost((await params).slug);
  if (!post) return { title: "Yazı bulunamadı", robots: { index: false, follow: false } };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: post.cover ? [{ url: post.cover.url, alt: post.cover.altText }] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: Props) {
  const post = await getPublicPost((await params).slug);
  if (!post) notFound();

  let body: React.ReactNode;
  try {
    body = renderPostContent(post.content);
  } catch {
    body = <p>Bu yazının içeriği görüntülenemiyor.</p>;
  }

  return (
    <main id="main-content">
      <article className="post-article">
        <header className="site-container post-hero">
          <p className="eyebrow">{post.categoryName ?? "Genel"}</p>
          <h1>{post.title}</h1>
          {post.publishedAt && (
            <p className="post-meta">
              <time dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}</time>
            </p>
          )}
          {post.cover && (
            <div className="post-cover">
              <Image src={imageDeliveryUrl(post.cover.url)} alt={post.cover.altText} fill priority sizes="(max-width: 1024px) 100vw, 60rem" />
            </div>
          )}
        </header>
        <div className="site-container post-body-wrap">
          {body}
          {post.tags.length > 0 && (
            <ul className="post-tags" aria-label="Etiketler">
              {post.tags.map((tag) => (
                <li key={tag.id}>#{tag.name}</li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </main>
  );
}
