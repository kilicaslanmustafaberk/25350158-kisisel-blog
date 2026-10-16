"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export type ExperienceItem = {
  id: string;
  organization: string;
  position: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  isVisible: boolean;
};

function ExperienceForm({ initial, onDone, onCancel }: { initial: ExperienceItem | null; onDone: () => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      organization: String(data.get("organization") ?? ""),
      position: String(data.get("position") ?? ""),
      startDate: String(data.get("startDate") ?? ""),
      endDate: isCurrent ? "" : String(data.get("endDate") ?? ""),
      isCurrent: data.has("isCurrent"),
      description: String(data.get("description") ?? ""),
      isVisible: data.has("isVisible"),
    };
    const response = await fetch(initial ? `/api/admin/experience/${initial.id}` : "/api/admin/experience", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Deneyim kaydı kaydedilemedi.");
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
        <span>Kurum / şirket</span>
        <input required minLength={2} maxLength={160} name="organization" defaultValue={initial?.organization} />
      </label>
      <label className="form-field">
        <span>Pozisyon</span>
        <input required minLength={2} maxLength={160} name="position" defaultValue={initial?.position} />
      </label>
      <label className="form-field">
        <span>Başlangıç</span>
        <input required type="date" name="startDate" defaultValue={initial?.startDate} />
      </label>
      <label className="form-field">
        <span>Bitiş</span>
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

export function ExperienceManager({ items }: { items: ExperienceItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function done() {
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string, organization: string) {
    if (!window.confirm(`“${organization}” deneyim kaydını silmek istediğinizden emin misiniz?`)) return;
    const response = await fetch(`/api/admin/experience/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else alert("Deneyim kaydı silinemedi.");
  }

  async function move(id: string, direction: "up" | "down") {
    const response = await fetch(`/api/admin/experience/${id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (response.ok) router.refresh();
    else alert("Sıralama güncellenemedi.");
  }

  const editing = editingId && editingId !== "new" ? (items.find((item) => item.id === editingId) ?? null) : null;

  return (
    <section className="media-manager" aria-labelledby="experience-title">
      <div>
        <p className="eyebrow">CV</p>
        <h2 id="experience-title">Deneyim</h2>
        <p>Deneyim opsiyoneldir; kayıt yoksa public CV&apos;de bölüm hiç görünmez.</p>
      </div>
      {editingId !== null ? (
        <ExperienceForm key={editingId} initial={editing} onDone={done} onCancel={() => setEditingId(null)} />
      ) : (
        <button className="button button-primary" type="button" onClick={() => setEditingId("new")}>
          Yeni deneyim ekle
        </button>
      )}
      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kurum</th>
                <th>Pozisyon</th>
                <th>Tarih</th>
                <th>Görünürlük</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{item.organization}</td>
                  <td>{item.position}</td>
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
                      <button className="danger" type="button" onClick={() => remove(item.id, item.organization)}>
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
        <p className="field-note">Henüz deneyim kaydı yok.</p>
      )}
    </section>
  );
}
