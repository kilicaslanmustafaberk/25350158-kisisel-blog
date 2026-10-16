import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTiptapDocument, postContentSchema } from "../src/features/blog/content-schema";
import { categoryInputSchema, postInputSchema, toSlug } from "../src/features/blog/validation";

const validDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Başlık" }] },
    { type: "paragraph", content: [{ type: "text", text: "Merhaba ", marks: [{ type: "bold" }] }, { type: "text", text: "dünya" }] },
  ],
};

const validPost = {
  title: "Güvenli Blog Yazısı",
  slug: "guvenli-blog-yazisi",
  excerpt: "Doğrulama testinde kullanılan yeterince uzun bir özet metni.",
  content: validDoc,
  categoryId: "",
  tagIds: [],
  newTagNames: [],
  status: "draft",
  publishedAt: "",
  seoTitle: "",
  seoDescription: "",
};

test("geçerli Tiptap doküman normalize edilir", () => {
  const normalized = normalizeTiptapDocument(validDoc);
  assert.equal(normalized.type, "doc");
  assert.equal(normalized.content?.length, 2);
});

test("desteklenmeyen düğüm türü reddedilir", () => {
  const malicious = { type: "doc", content: [{ type: "image", attrs: { src: "https://example.com/x.png" } }] };
  assert.throws(() => normalizeTiptapDocument(malicious));
});

test("raw HTML/script benzeri düğüm reddedilir", () => {
  const malicious = { type: "doc", content: [{ type: "html", content: "<script>alert(1)</script>" }] };
  assert.throws(() => normalizeTiptapDocument(malicious));
});

test("javascript: link protokolü reddedilir", () => {
  const malicious = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "tıkla", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }],
  };
  assert.throws(() => normalizeTiptapDocument(malicious));
});

test("data: ve vbscript: link protokolleri reddedilir", () => {
  for (const href of ["data:text/html;base64,abc", "vbscript:msgbox(1)"]) {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href } }] }] }] };
    assert.throws(() => normalizeTiptapDocument(doc));
  }
});

test("http/https/mailto linkleri kabul edilir ve external link rel/target normalize edilir", () => {
  const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }] };
  const normalized = normalizeTiptapDocument(doc);
  const mark = normalized.content?.[0].content?.[0].marks?.[0];
  assert.equal(mark?.type, "link");
  assert.equal((mark as { attrs: { target: string | null } }).attrs.target, "_blank");
});

test("boş içerik reddedilir", () => {
  assert.throws(() => normalizeTiptapDocument({ type: "doc", content: [] }));
});

test("postContentSchema zod entegrasyonu geçerli/geçersiz dokümanı ayırır", () => {
  assert.equal(postContentSchema.safeParse(validDoc).success, true);
  assert.equal(postContentSchema.safeParse({ type: "doc", content: [{ type: "iframe" }] }).success, false);
});

test("post whitelist şeması geçerli payload'u normalize eder", () => {
  const result = postInputSchema.parse(validPost);
  assert.equal(result.categoryId, null);
  assert.equal(result.publishedAt, null);
});

test("geçersiz slug reddedilir", () => {
  assert.equal(postInputSchema.safeParse({ ...validPost, slug: "Geçersiz Slug" }).success, false);
});

test("çok kısa özet reddedilir", () => {
  assert.equal(postInputSchema.safeParse({ ...validPost, excerpt: "kısa" }).success, false);
});

test("kategori whitelist şeması", () => {
  assert.equal(categoryInputSchema.safeParse({ name: "Mühendislik", slug: "muhendislik", description: "" }).success, true);
  assert.equal(categoryInputSchema.safeParse({ name: "M", slug: "muhendislik", description: "" }).success, false);
});

test("Türkçe başlık güvenli slug'a dönüşür", () => {
  assert.equal(toSlug("İş Ölçeği: Güçlü Çözüm"), "is-olcegi-guclu-cozum");
});
