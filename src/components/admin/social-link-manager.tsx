"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { defaultShowInCv, socialPlatformLabels, socialPlatformValues, type SocialPlatform } from "@/features/social/validation";

export type SocialLinkItem = {
  id: string;
  platform: string;
  label: string;
  url: string;
  isVisible: boolean;
  showInCv: boolean;
};

const platformLabel = (platform: string) => socialPlatformLabels[platform as SocialPlatform] ?? platform;

function SocialLinkForm({ initial, onDone, onCancel }: { initial: SocialLinkItem | null; onDone: () => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showInCv, setShowInCv] = useState(initial?.showInCv ?? true);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      platform: String(data.get("platform") ?? ""),
      label: String(data.get("label") ?? ""),
      url: String(data.get("url") ?? ""),
      isVisible: data.has("isVisible"),
      showInCv,
    };
    const response = await fetch(initial ? `/api/admin/social-links/${initial.id}` : "/api/admin/social-links", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.details?.url?.[0] ?? result.error ?? "Sosyal bağlantı kaydedilemedi.");
      return;
    }
    onDone();
  }

  const initialPlatform = initial && (socialPlatformValues as readonly string[]).includes(initial.platform) ? initial.platform : "github";

  return (
    <form className="media-upload" onSubmit={submit}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label className="form-field">
        <span>Platform</span>
        <select name="platform" defaultValue={initialPlatform} onChange={(event) => { if (!initial) setShowInCv(defaultShowInCv(event.target.value)); }}>
          {socialPlatformValues.map((platform) => (
            <option key={platform} value={platform}>
              {socialPlatformLabels[platform]}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Görünen ad</span>
        <input required minLength={1} maxLength={60} name="label" defaultValue={initial?.label} />
      </label>
      <label className="form-field form-span">
        <span>Adres (yalnız https://)</span>
        <input required type="url" inputMode="url" maxLength={300} name="url" placeholder="https://" defaultValue={initial?.url} aria-describedby="social-url-note" />
      </label>
      <p className="field-note form-span" id="social-url-note">
        GitHub için https://github.com/kullanici-adi biçimi gerekir; görünür GitHub bağlantısı landing GitHub bölümünü besler.
      </p>
      <label className="check-field">
        <input type="checkbox" name="isVisible" defaultChecked={initial?.isVisible ?? true} /> Public sitede görünür
      </label>
      <label className="check-field">
        <input type="checkbox" name="showInCv" checked={showInCv} onChange={(event) => setShowInCv(event.target.checked)} /> CV&apos;de göster
      </label>
      <p className="field-note">CV&apos;de görünmek için iki seçim de açık olmalıdır.</p>
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

export function SocialLinkManager({ items }: { items: SocialLinkItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function done() {
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string, label: string) {
    if (!window.confirm(`“${label}” bağlantısını silmek istediğinizden emin misiniz?`)) return;
    const response = await fetch(`/api/admin/social-links/${id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else alert("Sosyal bağlantı silinemedi.");
  }

  async function toggleVisibility(item: SocialLinkItem) {
    const response = await fetch(`/api/admin/social-links/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: item.platform, label: item.label, url: item.url, isVisible: !item.isVisible, showInCv: item.showInCv }),
    });
    if (response.ok) router.refresh();
    else alert("Görünürlük güncellenemedi. Kaydı düzenleyip adresi kontrol edin.");
  }

  async function move(id: string, direction: "up" | "down") {
    const response = await fetch(`/api/admin/social-links/${id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (response.ok) router.refresh();
    else alert("Sıralama güncellenemedi.");
  }

  const editing = editingId && editingId !== "new" ? (items.find((item) => item.id === editingId) ?? null) : null;

  return (
    <section className="media-manager" aria-labelledby="social-title">
      <div>
        <p className="eyebrow">Profil</p>
        <h2 id="social-title">Sosyal bağlantılar</h2>
      </div>
      {editingId !== null ? (
        <SocialLinkForm key={editingId} initial={editing} onDone={done} onCancel={() => setEditingId(null)} />
      ) : (
        <button className="button button-primary" type="button" onClick={() => setEditingId("new")}>
          Yeni bağlantı ekle
        </button>
      )}
      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Ad</th>
                <th>Adres</th>
                <th>Görünürlük</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{platformLabel(item.platform)}</td>
                  <td>{item.label}</td>
                  <td className="break-cell">{item.url}</td>
                  <td>{item.isVisible ? "Sitede görünür" : "Gizli"}{item.showInCv && item.isVisible ? " · CV'de görünür" : " · CV dışı"}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => setEditingId(item.id)}>
                        Düzenle
                      </button>
                      <button type="button" onClick={() => toggleVisibility(item)}>
                        {item.isVisible ? "Gizle" : "Göster"}
                      </button>
                      <button type="button" disabled={index === 0} onClick={() => move(item.id, "up")}>
                        Yukarı
                      </button>
                      <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, "down")}>
                        Aşağı
                      </button>
                      <button className="danger" type="button" onClick={() => remove(item.id, item.label)}>
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
        <p className="field-note">Henüz sosyal bağlantı yok.</p>
      )}
    </section>
  );
}
