import "server-only";

import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";

import { categories, media, postTags, posts, tags } from "@/db/schema";
import type { CategoryInput, PostInput } from "@/features/blog/validation";
import { toSlug } from "@/features/blog/validation";

async function database() {
  return (await import("@/db")).db;
}

function resolvePublishedAt(status: PostInput["status"], requested: string | null, existing: Date | null) {
  if (status === "draft") return null;
  if (requested) return new Date(requested);
  return existing ?? new Date();
}

function postValues(input: PostInput, existingPublishedAt: Date | null) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: JSON.stringify(input.content),
    categoryId: input.categoryId,
    status: input.status,
    publishedAt: resolvePublishedAt(input.status, input.publishedAt, existingPublishedAt),
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    updatedAt: new Date(),
  };
}

export async function slugExists(slug: string, exceptId?: string) {
  const db = await database();
  const where = exceptId ? and(eq(posts.slug, slug), ne(posts.id, exceptId)) : eq(posts.slug, slug);
  return (await db.select({ id: posts.id }).from(posts).where(where).limit(1)).length > 0;
}

export async function categorySlugExists(slug: string, exceptId?: string) {
  const db = await database();
  const where = exceptId ? and(eq(categories.slug, slug), ne(categories.id, exceptId)) : eq(categories.slug, slug);
  return (await db.select({ id: categories.id }).from(categories).where(where).limit(1)).length > 0;
}

export async function validateCategoryId(categoryId: string | null) {
  if (!categoryId) return true;
  const db = await database();
  return (await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1)).length > 0;
}

export async function validateTagIds(tagIds: string[]) {
  const db = await database();
  if (!tagIds.length) return true;
  const rows = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds));
  return rows.length === tagIds.length;
}

/** Case-insensitive find-or-create by normalized slug; keeps tag identity stable across naming variants. */
export async function resolveNewTagIds(names: string[]) {
  const db = await database();
  const created: string[] = [];
  for (const name of names) {
    const slug = toSlug(name);
    if (!slug) continue;
    const existing = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1);
    if (existing[0]) {
      created.push(existing[0].id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(tags).values({ id, name: name.slice(0, 60), slug });
    created.push(id);
  }
  return created;
}

export async function postExists(id: string) {
  const db = await database();
  return (await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1)).length > 0;
}

export async function createPost(input: PostInput, tagIds: string[]) {
  const db = await database();
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(posts).values({ id, ...postValues(input, null), createdAt: new Date() });
    if (tagIds.length) {
      await tx.insert(postTags).values(tagIds.map((tagId) => ({ postId: id, tagId })));
    }
  });
  return id;
}

export async function updatePost(id: string, input: PostInput, tagIds: string[]) {
  const db = await database();
  await db.transaction(async (tx) => {
    const current = await tx.select({ publishedAt: posts.publishedAt }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!current[0]) throw new Error("POST_NOT_FOUND");
    await tx.update(posts).set(postValues(input, current[0].publishedAt)).where(eq(posts.id, id));
    await tx.delete(postTags).where(eq(postTags.postId, id));
    if (tagIds.length) {
      await tx.insert(postTags).values(tagIds.map((tagId) => ({ postId: id, tagId })));
    }
  });
}

export async function updatePostStatus(id: string, status: "draft" | "published") {
  const db = await database();
  const current = await db.select({ publishedAt: posts.publishedAt }).from(posts).where(eq(posts.id, id)).limit(1);
  if (!current[0]) return null;
  const publishedAt = resolvePublishedAt(status, null, current[0].publishedAt);
  const updated = await db
    .update(posts)
    .set({ status, publishedAt, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning({ slug: posts.slug });
  return updated[0] ?? null;
}

export async function deletePost(id: string) {
  const db = await database();
  const deleted = await db.delete(posts).where(eq(posts.id, id)).returning({ slug: posts.slug });
  return deleted[0] ?? null;
}

export async function listCategories() {
  const db = await database();
  return db.select({ id: categories.id, name: categories.name, slug: categories.slug, description: categories.description })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));
}

export async function createCategory(input: CategoryInput) {
  const db = await database();
  const id = crypto.randomUUID();
  await db.insert(categories).values({ id, name: input.name, slug: input.slug, description: input.description, createdAt: new Date(), updatedAt: new Date() });
  return id;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const db = await database();
  const updated = await db
    .update(categories)
    .set({ name: input.name, slug: input.slug, description: input.description, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning({ id: categories.id });
  return updated.length > 0;
}

export async function deleteCategory(id: string) {
  const db = await database();
  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
  return deleted.length > 0;
}

export async function listTags() {
  const db = await database();
  return db.select({ id: tags.id, name: tags.name, slug: tags.slug }).from(tags).orderBy(asc(tags.name));
}

export async function listAdminPosts() {
  const db = await database();
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      status: posts.status,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      categoryName: categories.name,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .orderBy(desc(posts.updatedAt));
}

export async function getAdminPost(id: string) {
  const db = await database();
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!rows[0]) return null;
  const [tagRows, coverRows] = await Promise.all([
    db.select({ id: tags.id, name: tags.name }).from(postTags).innerJoin(tags, eq(postTags.tagId, tags.id)).where(eq(postTags.postId, id)),
    rows[0].coverMediaId
      ? db.select({ id: media.id, url: media.url, altText: media.altText }).from(media).where(eq(media.id, rows[0].coverMediaId)).limit(1)
      : Promise.resolve([]),
  ]);
  return {
    ...rows[0],
    content: JSON.parse(rows[0].content),
    tagIds: tagRows.map((row) => row.id),
    tags: tagRows,
    cover: coverRows[0] ?? null,
  };
}

type PublicPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
};

async function attachPublicExtras<T extends PublicPostRow>(rows: T[]) {
  const db = await database();
  const ids = rows.map((row) => row.id);
  if (!ids.length) return rows.map((row) => ({ ...row, cover: null as { url: string; altText: string } | null, tags: [] as { id: string; name: string; slug: string }[] }));

  const [coverRows, tagRows] = await Promise.all([
    db
      .select({ postId: posts.id, url: media.url, altText: media.altText })
      .from(posts)
      .innerJoin(media, eq(posts.coverMediaId, media.id))
      .where(inArray(posts.id, ids)),
    db
      .select({ postId: postTags.postId, id: tags.id, name: tags.name, slug: tags.slug })
      .from(postTags)
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, ids)),
  ]);
  const coverMap = new Map(coverRows.filter((row) => row.url).map((row) => [row.postId, { url: row.url as string, altText: row.altText }]));
  const tagMap = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const row of tagRows) tagMap.set(row.postId, [...(tagMap.get(row.postId) ?? []), { id: row.id, name: row.name, slug: row.slug }]);

  return rows.map((row) => ({ ...row, cover: coverMap.get(row.id) ?? null, tags: tagMap.get(row.id) ?? [] }));
}

export async function listPublicPosts(options?: { limit?: number }) {
  const db = await database();
  let query = db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      categoryId: posts.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .$dynamic();
  if (options?.limit) query = query.limit(options.limit);
  return attachPublicExtras(await query);
}

export async function getPublicPost(slug: string) {
  const db = await database();
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: posts.content,
      publishedAt: posts.publishedAt,
      seoTitle: posts.seoTitle,
      seoDescription: posts.seoDescription,
      categoryId: posts.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);
  if (!rows[0]) return null;
  const [withExtras] = await attachPublicExtras([rows[0]]);
  return { ...withExtras, content: JSON.parse(rows[0].content) as unknown };
}

export async function attachPostCover(input: {
  postId: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string;
}) {
  const db = await database();
  const mediaId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(media).values({
      id: mediaId,
      storageKey: input.key,
      url: input.url,
      mimeType: input.mimeType,
      size: input.size,
      width: input.width,
      height: input.height,
      altText: input.altText,
    });
    await tx.update(posts).set({ coverMediaId: mediaId, updatedAt: new Date() }).where(eq(posts.id, input.postId));
  });
  return mediaId;
}

export async function removePostCover(postId: string) {
  const db = await database();
  const updated = await db.update(posts).set({ coverMediaId: null, updatedAt: new Date() }).where(eq(posts.id, postId)).returning({ id: posts.id });
  return updated.length > 0;
}

