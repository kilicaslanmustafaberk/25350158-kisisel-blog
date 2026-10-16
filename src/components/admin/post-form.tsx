"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { toSlug } from "@/features/blog/validation";
import { TiptapEditor } from "@/components/admin/tiptap-editor";

type Category = { id: string; name: string };
type Tag = { id: string; name: string };
type Initial = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: unknown;
  categoryId?: string | null;
  tagIds?: string[];
  status?: string;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PostForm({ initial = {}, categories, tags }: { initial?: Initial; categories: Category[]; tags: Tag[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug));
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [status, setStatus] = useState(initial.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState(toLocalDateTimeInput(initial.publishedAt));
  const [content, setContent] = useState<unknown>(initial.content ?? { type: "doc", content: [{ type: "paragraph" }] });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const newTagNames = String(data.get("newTagNames") ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const body = {
      title: String(data.get("title") ?? ""),
      slug: String(data.get("slug") ?? ""),
      excerpt: String(data.get("excerpt") ?? ""),
      content,
      categoryId: String(data.get("categoryId") ?? ""),
      tagIds: data.getAll("tagIds").map(String),
      newTagNames,
      status: String(data.get("status") ?? "draft"),
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : "",
      seoTitle: String(data.get("seoTitle") ?? ""),
      seoDescription: String(data.get("seoDescription") ?? ""),
    };
    const response = await fetch(initial.id ? `/api/admin/posts/${initial.id}` : "/api/admin/posts", {
      method: initial.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Yazı kaydedilemedi.");
      return;
    }
    router.push(`/admin/blog/${result.id}/edit`);
    router.refresh();
  }

  return (
    <form className="project-form" onSubmit={submit}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <fieldset>
        <legend>İçerik</legend>
        <div className="form-grid">
          <label className="form-field">
            <span>Başlık</span>
            <input
              required
              minLength={2}
              maxLength={200}
              name="title"
              defaultValue={initial.title}
              onChange={(event) => {
                if (!slugEdited) setSlug(toSlug(event.target.value));
              }}
            />
          </label>
          <label className="form-field">
            <span>Slug</span>
            <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} />
          </label>
          <label className="form-field form-span">
            <span>Özet</span>
            <textarea required minLength={10} maxLength={500} name="excerpt" defaultValue={initial.excerpt} />
          </label>
        </div>
        <div className="form-field form-span tiptap-field">
          <span>İçerik gövdesi</span>
          <TiptapEditor content={content} onChange={setContent} />
        </div>
      </fieldset>

      <fieldset>
        <legend>Sınıflandırma</legend>
        <div className="form-grid">
          <label className="form-field">
            <span>Kategori</span>
            <select name="categoryId" defaultValue={initial.categoryId ?? ""}>
              <option value="">Kategorisiz</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Yeni etiketler (virgülle ayırın)</span>
            <input name="newTagNames" placeholder="ör. next.js, güvenlik" />
          </label>
        </div>
        {tags.length > 0 && (
          <div className="skill-options">
            {tags.map((tag) => (
              <label className="check-field" key={tag.id}>
                <input type="checkbox" name="tagIds" value={tag.id} defaultChecked={initial.tagIds?.includes(tag.id)} />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Yayın</legend>
        <div className="form-grid">
          <label className="form-field">
            <span>Durum</span>
            <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
            </select>
          </label>
          <label className="form-field">
            <span>Yayın tarihi</span>
            <input
              type="datetime-local"
              name="publishedAtDisplay"
              value={publishedAt}
              disabled={status !== "published"}
              onChange={(event) => setPublishedAt(event.target.value)}
            />
            <small className="field-note">Boş bırakılırsa yayınlama anında otomatik atanır.</small>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>SEO</legend>
        <div className="form-grid">
          <label className="form-field">
            <span>SEO başlığı (opsiyonel)</span>
            <input maxLength={70} name="seoTitle" defaultValue={initial.seoTitle ?? ""} />
          </label>
          <label className="form-field">
            <span>SEO açıklaması (opsiyonel)</span>
            <input maxLength={160} name="seoDescription" defaultValue={initial.seoDescription ?? ""} />
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Kaydediliyor…" : initial.id ? "Değişiklikleri kaydet" : "Yazıyı oluştur"}
        </button>
        <button className="button button-secondary" type="button" onClick={() => router.push("/admin/blog")}>
          İptal
        </button>
      </div>
    </form>
  );
}
