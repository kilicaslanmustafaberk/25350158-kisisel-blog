"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { cvSectionIds, type CvSectionId } from "@/features/cv/validation";

const sectionTitlesTr: Record<CvSectionId, string> = {
  summary: "Profil / Özet",
  skills: "Yetenekler",
  projects: "Projeler",
  experience: "Deneyim",
  education: "Eğitim",
  certificates: "Sertifikalar",
};

type Initial = {
  title?: string;
  summaryOverride?: string | null;
  language?: string;
  sectionVisibility?: Record<string, boolean>;
  sectionOrder?: string[];
  maxProjects?: number;
};

function initialOrder(order?: string[]): CvSectionId[] {
  const valid = (order ?? []).filter((id): id is CvSectionId => (cvSectionIds as readonly string[]).includes(id));
  const missing = cvSectionIds.filter((id) => !valid.includes(id));
  return valid.length ? [...valid, ...missing] : [...cvSectionIds];
}

export function CvSettingsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<CvSectionId[]>(() => initialOrder(initial.sectionOrder));
  const [visibility, setVisibility] = useState<Record<CvSectionId, boolean>>(() => {
    const source = initial.sectionVisibility ?? {};
    return Object.fromEntries(cvSectionIds.map((id) => [id, source[id] !== false])) as Record<CvSectionId, boolean>;
  });

  function move(id: CvSectionId, direction: "up" | "down") {
    setOrder((current) => {
      const index = current.indexOf(id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      title: String(data.get("title") ?? ""),
      summaryOverride: String(data.get("summaryOverride") ?? ""),
      language: String(data.get("language") ?? "tr"),
      sectionVisibility: visibility,
      sectionOrder: order,
      maxProjects: Number(data.get("maxProjects") ?? 6),
    };
    const response = await fetch("/api/admin/cv/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "CV ayarları kaydedilemedi.");
      return;
    }
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
        <legend>CV ayarları</legend>
        <div className="form-grid">
          <label className="form-field">
            <span>CV başlığı</span>
            <input required minLength={2} maxLength={120} name="title" defaultValue={initial.title ?? "Özgeçmiş"} />
          </label>
          <label className="form-field">
            <span>Dil</span>
            <select name="language" defaultValue={initial.language ?? "tr"}>
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="form-field">
            <span>CV&apos;de gösterilecek azami proje sayısı</span>
            <input required type="number" min={1} max={20} name="maxProjects" defaultValue={initial.maxProjects ?? 6} />
          </label>
          <label className="form-field form-span">
            <span>CV Profesyonel Özeti (opsiyonel)</span>
            <textarea maxLength={1_000} name="summaryOverride" defaultValue={initial.summaryOverride ?? ""} />
            <small className="field-note">Boş bırakılırsa Hakkımda metni kullanılır. İkisi de boşsa özet bölümü gösterilmez.</small>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Bölüm sırası ve görünürlüğü</legend>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Bölüm</th>
                <th>Görünür</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {order.map((id, index) => (
                <tr key={id}>
                  <td>{index + 1}</td>
                  <td>{sectionTitlesTr[id]}</td>
                  <td>
                    <label className="check-field">
                      <input type="checkbox" checked={visibility[id]} onChange={(event) => setVisibility((current) => ({ ...current, [id]: event.target.checked }))} />
                      <span className="sr-only">{sectionTitlesTr[id]} görünür</span>
                    </label>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button type="button" disabled={index === 0} onClick={() => move(id, "up")}>
                        Yukarı
                      </button>
                      <button type="button" disabled={index === order.length - 1} onClick={() => move(id, "down")}>
                        Aşağı
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="field-note">Görünürlük kapatılan veya içeriği boş olan bölümler public CV&apos;de hiç render edilmez.</p>
      </fieldset>
      <div className="form-actions">
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Kaydediliyor…" : "CV ayarlarını kaydet"}
        </button>
      </div>
    </form>
  );
}
