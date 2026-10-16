"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { toSlug } from "@/features/blog/validation";

type Category = { id: string; name: string; slug: string; description: string | null };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slug, setSlug] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = { name: String(data.get("name") ?? ""), slug, description: String(data.get("description") ?? "") };
    const response = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Kategori kaydedilemedi.");
      return;
    }
    form.reset();
    setSlug("");
    setSlugEdited(false);
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`“${name}” kategorisini silmek istediğinizden emin misiniz? Bu kategoriye bağlı yazılar kategorisiz kalır.`)) return;
    const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else alert("Kategori silinemedi.");
  }

  return (
    <section className="media-manager" aria-labelledby="category-title">
      <div>
        <p className="eyebrow">Blog CMS</p>
        <h2 id="category-title">Kategoriler</h2>
      </div>
      <form className="media-upload" onSubmit={create}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label className="form-field">
          <span>Ad</span>
          <input
            required
            minLength={2}
            maxLength={80}
            name="name"
            onChange={(event) => {
              if (!slugEdited) setSlug(toSlug(event.target.value));
            }}
          />
        </label>
        <label className="form-field">
          <span>Slug</span>
          <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} />
        </label>
        <label className="form-field form-span">
          <span>Açıklama (opsiyonel)</span>
          <input maxLength={300} name="description" />
        </label>
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Kaydediliyor…" : "Kategori ekle"}
        </button>
      </form>
      {categories.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Slug</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>/{category.slug}</td>
                  <td>
                    <div className="table-actions">
                      <button className="text-button danger" type="button" onClick={() => remove(category.id, category.name)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="field-note">Henüz kategori yok.</p>
      )}
    </section>
  );
}
