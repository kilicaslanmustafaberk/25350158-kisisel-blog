"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { toSlug } from "@/features/cv/validation";

export type SkillItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  isVisible: boolean;
};

function SkillForm({ initial, onDone, onCancel }: { initial: SkillItem | null; onDone: () => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.slug));
  const [slug, setSlug] = useState(initial?.slug ?? "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      name: String(data.get("name") ?? ""),
      slug,
      category: String(data.get("category") ?? ""),
      description: String(data.get("description") ?? ""),
      isVisible: data.has("isVisible"),
    };
    const response = await fetch(initial ? `/api/admin/skills/${initial.id}` : "/api/admin/skills", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Yetenek kaydedilemedi.");
      return;
    }
    onDone();
  }

  return (
    <form className="media-upload" onSubmit={submit}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label className="form-field">
        <span>Ad</span>
        <input
          required
          minLength={1}
          maxLength={60}
          name="name"
          defaultValue={initial?.name}
          onChange={(event) => {
            if (!slugEdited) setSlug(toSlug(event.target.value));
          }}
        />
      </label>
      <label className="form-field">
        <span>Slug</span>
        <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} />
      </label>
      <label className="form-field">
        <span>Kategori</span>
        <input required minLength={2} maxLength={60} name="category" defaultValue={initial?.category} placeholder="ör. Frontend, Backend, Araçlar" />
      </label>
      <label className="check-field">
        <input type="checkbox" name="isVisible" defaultChecked={initial?.isVisible ?? true} /> Public portfolio/CV&apos;de görünür
      </label>
      <label className="form-field form-span">
        <span>Açıklama (opsiyonel)</span>
        <input maxLength={300} name="description" defaultValue={initial?.description ?? ""} />
      </label>
      <div className="form-actions">
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Kaydediliyor…" : initial ? "Değişiklikleri kaydet" : "Ekle"}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          İptal
        </button>
      </div>
    </form>
  );
}

export function SkillManager({ items }: { items: SkillItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function done() {
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`“${name}” yeteneğini silmek istediğinizden emin misiniz? Bu, yeteneği bağlı olduğu tüm projelerden de kaldırır.`)) return;
    const response = await fetch(`/api/admin/skills/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else alert("Yetenek silinemedi.");
  }

  async function move(id: string, direction: "up" | "down") {
    const response = await fetch(`/api/admin/skills/${id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (response.ok) router.refresh();
    else alert("Sıralama güncellenemedi.");
  }

  const editing = editingId && editingId !== "new" ? (items.find((item) => item.id === editingId) ?? null) : null;
  const grouped = new Map<string, SkillItem[]>();
  for (const item of items) grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);

  return (
    <section className="media-manager" aria-labelledby="skills-title">
      <div>
        <p className="eyebrow">CV</p>
        <h2 id="skills-title">Yetenekler</h2>
        <p>Yetenek adları gerçek isimlerdir; öznel yüzde/percentage sistemi kullanılmaz.</p>
      </div>
      {editingId !== null ? (
        <SkillForm key={editingId} initial={editing} onDone={done} onCancel={() => setEditingId(null)} />
      ) : (
        <button className="button button-primary" type="button" onClick={() => setEditingId("new")}>
          Yeni yetenek ekle
        </button>
      )}
      {[...grouped.entries()].map(([category, categoryItems]) => (
        <div className="admin-table-wrap" key={category}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{category}</th>
                <th>Slug</th>
                <th>Görünürlük</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {categoryItems.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>/{item.slug}</td>
                  <td>{item.isVisible ? "Görünür" : "Gizli"}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => setEditingId(item.id)}>
                        Düzenle
                      </button>
                      <button type="button" disabled={index === 0} onClick={() => move(item.id, "up")}>
                        Yukarı
                      </button>
                      <button type="button" disabled={index === categoryItems.length - 1} onClick={() => move(item.id, "down")}>
                        Aşağı
                      </button>
                      <button className="danger" type="button" onClick={() => remove(item.id, item.name)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {!items.length && <p className="field-note">Henüz yetenek yok.</p>}
    </section>
  );
}
