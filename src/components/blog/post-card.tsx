import Image from "next/image";
import Link from "next/link";
import { SpineAnchor } from "@/components/motion/spine-lane";
import { imageDeliveryUrl } from "@/features/media/delivery-url";

type CardPost = {
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  categoryName: string | null;
  tags: { id: string; name: string; slug: string }[];
  cover: { url: string; altText: string } | null;
};

export function PostCard({ post, spineAnchor = false }: { post: CardPost; spineAnchor?: boolean }) {
  return (
    <article className="project-card" data-reveal={spineAnchor ? undefined : ""} data-spine-item={spineAnchor ? "" : undefined}>
      {spineAnchor && <SpineAnchor />}
      <Link className="project-preview" href={`/blog/${post.slug}`} aria-label={`${post.title} yazısını aç`}>
        {post.cover ? (
          <Image src={imageDeliveryUrl(post.cover.url)} alt={post.cover.altText} fill sizes="(max-width: 768px) 100vw, 50vw" />
        ) : (
          <div className="project-preview-fallback">
            <span>Blog</span>
            <strong>{post.title.slice(0, 2).toUpperCase()}</strong>
          </div>
        )}
      </Link>
      <div className="project-card-body">
        <div className="project-card-meta">
          <span>{post.categoryName ?? "Genel"}</span>
          {post.publishedAt && <time dateTime={post.publishedAt.toISOString()}>{post.publishedAt.toLocaleDateString("tr-TR")}</time>}
        </div>
        <h3>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        <Link className="inline-link" href={`/blog/${post.slug}`}>
          Yazıyı oku <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
