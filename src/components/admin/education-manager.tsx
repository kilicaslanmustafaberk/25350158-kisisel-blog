"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type EducationItem = {
  id: string;
  institution: string;
  program: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  isVisible: boolean;
};

function EducationForm({ initial, onDone, onCancel }: { initial: EducationItem | null; onDone: () => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      institution: String(data.get("institution") ?? ""),
      program: String(data.get("program") ?? ""),
      startDate: String(data.get("startDate") ?? ""),
      endDate: isCurrent ? "" : String(data.get("endDate") ?? ""),
      isCurrent: data.has("isCurrent"),
      description: String(data.get("description") ?? ""),
      isVisible: data.has("isVisible"),
    };
    const response = await fetch(initial ? `/api/admin/education/${initial.id}` : "/api/admin/education", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Eğitim kaydı kaydedilemedi.");
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
        <span>Kurum</span>
        <input required minLength={2} maxLength={160} name="institution" defaultValue={initial?.institution} />
      </label>
      <label className="form-field">
        <span>Program / Bölüm (opsiyonel)</span>
        <input maxLength={160} name="program" defaultValue={initial?.program} />
      </label>
      <label className="form-field">
        <span>Başlangıç</span>
        <input required type="date" name="startDate" defaultValue={initial?.startDate} />
      </label>
      <label className="form-field">
        <span>Bitiş (opsiyonel)</span>
        <input type="date" name="endDate" disabled={isCurrent} defaultValue={initial?.endDate ?? ""} />
      </label>
      <label className="check-field">
        <input type="checkbox" name="isCurrent" checked={isCurrent} onChange={(event) => setIsCurrent(event.target.checked)} /> Hâlâ devam ediyor
      </label>
      <label className="check-field">
        <input type="checkbox" name="isVisible" defaultChecked={initial?.isVisible ?? true} /> Public CV&apos;de görünür
      </label>
      <label className="form-field form-span">
        <span>Açıklama (opsiyonel)</span>
        <textarea maxLength={2_000} name="description" defaultValue={initial?.description ?? ""} />
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

export function EducationManager({ items }: { items: EducationItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function done() {
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string, institution: string) {
    if (!window.confirm(`“${institution}” eğitim kaydını silmek istediğinizden emin misiniz?`)) return;
    const response = await fetch(`/api/admin/education/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else alert("Eğitim kaydı silinemedi.");
  }

  async function move(id: string, direction: "up" | "down") {
    const response = await fetch(`/api/admin/education/${id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (response.ok) router.refresh();
    else alert("Sıralama güncellenemedi.");
  }

  const editing = editingId && editingId !== "new" ? (items.find((item) => item.id === editingId) ?? null) : null;

  return (
    <section className="media-manager" aria-labelledby="education-title">
      <div>
        <p className="eyebrow">CV</p>
        <h2 id="education-title">Eğitim</h2>
      </div>
      {editingId !== null ? (
        <EducationForm key={editingId} initial={editing} onDone={done} onCancel={() => setEditingId(null)} />
      ) : (
        <button className="button button-primary" type="button" onClick={() => setEditingId("new")}>
          Yeni eğitim ekle
        </button>
      )}
      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kurum</th>
                <th>Program</th>
                <th>Tarih</th>
                <th>Görünürlük</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.institution}</td>
                  <td>{item.program}</td>
                  <td>
                    {item.startDate} – {item.isCurrent ? "devam ediyor" : (item.endDate ?? "—")}
                  </td>
                  <td>{item.isVisible ? "Görünür" : "Gizli"}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => setEditingId(item.id)}>
                        Düzenle
                      </button>
                      <button type="button" disabled={index === 0} onClick={() => move(item.id, "up")}>
                        Yukarı
                      </button>
                      <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, "down")}>
                        Aşağı
                      </button>
                      <button className="danger" type="button" onClick={() => remove(item.id, item.institution)}>
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
        <p className="field-note">Henüz eğitim kaydı yok.</p>
      )}
    </section>
  );
}
