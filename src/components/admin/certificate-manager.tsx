"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { certificatePrimaryMeta, toPublicCertificate } from "@/features/certificates/display";

export type CertificateItem = {
  id: string;
  title: string;
  issuer: string | null;
  instructor: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  description: string | null;
  displayOrder: number;
  isVisible: boolean;
  showInCv: boolean;
};

const bodyOf = (item: CertificateItem) => ({
  title: item.title,
  issuer: item.issuer ?? "",
  instructor: item.instructor ?? "",
  issuedAt: item.issuedAt ?? "",
  expiresAt: item.expiresAt ?? "",
  credentialId: item.credentialId ?? "",
  credentialUrl: item.credentialUrl ?? "",
  description: item.description ?? "",
  isVisible: item.isVisible,
  showInCv: item.showInCv,
});

function CertificateForm({ initial, onDone, onCancel }: { initial: CertificateItem | null; onDone: () => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const body = {
      title: text("title"),
      issuer: text("issuer"),
      instructor: text("instructor"),
      issuedAt: text("issuedAt"),
      expiresAt: text("expiresAt"),
      credentialId: text("credentialId"),
      credentialUrl: text("credentialUrl"),
      description: text("description"),
      isVisible: data.has("isVisible"),
      showInCv: data.has("showInCv"),
    };
    const response = await fetch(initial ? `/api/admin/certificates/${initial.id}` : "/api/admin/certificates", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      const details = result.details ?? {};
      setError(details.title?.[0] ?? details.credentialUrl?.[0] ?? details.expiresAt?.[0] ?? details.issuedAt?.[0] ?? result.error ?? "Sertifika kaydedilemedi.");
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
      <label className="form-field form-span">
        <span>Sertifika Adı</span>
        <input required minLength={2} maxLength={160} name="title" defaultValue={initial?.title} />
      </label>
      <label className="form-field">
        <span>Veren Kurum / Platform</span>
        <input maxLength={120} name="issuer" placeholder="Örn. BTK Akademi" defaultValue={initial?.issuer ?? ""} />
      </label>
      <label className="form-field">
        <span>Veren Kişi / Eğitmen</span>
        <input maxLength={120} name="instructor" defaultValue={initial?.instructor ?? ""} />
      </label>
      <label className="form-field">
        <span>Veriliş Tarihi</span>
        <input type="date" name="issuedAt" defaultValue={initial?.issuedAt ?? ""} />
      </label>
      <label className="form-field">
        <span>Geçerlilik Bitiş Tarihi</span>
        <input type="date" name="expiresAt" defaultValue={initial?.expiresAt ?? ""} />
      </label>
      <label className="form-field">
        <span>Credential / Sertifika No</span>
        <input maxLength={120} name="credentialId" defaultValue={initial?.credentialId ?? ""} />
      </label>
      <label className="form-field">
        <span>Doğrulama Linki</span>
        <input type="url" inputMode="url" maxLength={500} name="credentialUrl" placeholder="https://" defaultValue={initial?.credentialUrl ?? ""} />
      </label>
      <label className="form-field form-span">
        <span>Açıklama</span>
        <textarea maxLength={1000} name="description" rows={3} defaultValue={initial?.description ?? ""} />
      </label>
      <p className="field-note form-span">Yalnız Sertifika Adı zorunludur. Tarihler isteğe bağlıdır; doğrulama linki yalnız https:// olabilir.</p>
      <label className="check-field">
        <input type="checkbox" name="isVisible" defaultChecked={initial?.isVisible ?? true} /> Web Sitesinde Göster
      </label>
      <label className="check-field">
        <input type="checkbox" name="showInCv" defaultChecked={initial?.showInCv ?? true} /> CV&apos;de Göster
      </label>
      <p className="field-note">CV&apos;de görünmek için iki seçim de açık olmalıdır. Sıralama listedeki Yukarı/Aşağı düğmeleriyle yapılır.</p>
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

export function CertificateManager({ items }: { items: CertificateItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  function done() {
    setEditingId(null);
    router.refresh();
  }

  async function remove(item: CertificateItem) {
    if (!window.confirm(`“${item.title}” sertifikasını silmek istediğinizden emin misiniz?`)) return;
    const response = await fetch(`/api/admin/certificates/${item.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else alert("Sertifika silinemedi.");
  }

  async function toggle(item: CertificateItem, field: "isVisible" | "showInCv") {
    const response = await fetch(`/api/admin/certificates/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...bodyOf(item), [field]: !item[field] }),
    });
    if (response.ok) router.refresh();
    else alert("Görünürlük güncellenemedi. Kaydı düzenleyip alanları kontrol edin.");
  }

  async function move(id: string, direction: "up" | "down") {
    const response = await fetch(`/api/admin/certificates/${id}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    if (response.ok) router.refresh();
    else alert("Sıralama güncellenemedi.");
  }

  const editing = editingId && editingId !== "new" ? (items.find((item) => item.id === editingId) ?? null) : null;

  return (
    <section className="media-manager" aria-labelledby="certificates-title">
      <div>
        <p className="eyebrow">Kariyer</p>
        <h2 id="certificates-title">Sertifikalar</h2>
      </div>
      {editingId !== null ? (
        <CertificateForm key={editingId} initial={editing} onDone={done} onCancel={() => setEditingId(null)} />
      ) : (
        <button className="button button-primary" type="button" onClick={() => setEditingId("new")}>
          Yeni sertifika ekle
        </button>
      )}
      {items.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sıra</th>
                <th>Sertifika</th>
                <th>Kurum · Tarih</th>
                <th>Görünürlük</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.title}</td>
                  <td>{certificatePrimaryMeta(toPublicCertificate(item))}</td>
                  <td>{item.isVisible ? "Sitede görünür" : "Gizli"}{item.isVisible && item.showInCv ? " · CV'de görünür" : " · CV dışı"}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => setEditingId(item.id)}>
                        Düzenle
                      </button>
                      <button type="button" onClick={() => toggle(item, "isVisible")}>
                        {item.isVisible ? "Gizle" : "Göster"}
                      </button>
                      <button type="button" onClick={() => toggle(item, "showInCv")}>
                        {item.showInCv ? "CV'den çıkar" : "CV'ye ekle"}
                      </button>
                      <button type="button" disabled={index === 0} onClick={() => move(item.id, "up")}>
                        Yukarı
                      </button>
                      <button type="button" disabled={index === items.length - 1} onClick={() => move(item.id, "down")}>
                        Aşağı
                      </button>
                      <button className="danger" type="button" onClick={() => remove(item)}>
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
        <p className="field-note">Henüz sertifika yok. Görünür sertifika olmadığında landing ve CV&apos;de bölüm hiç gösterilmez.</p>
      )}
    </section>
  );
}
