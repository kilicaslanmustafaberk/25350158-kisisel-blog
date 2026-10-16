"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Initial = {
  fullName?: string;
  headline?: string;
  shortBio?: string;
  longBio?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  isPhoneVisible?: boolean;
  isEmailVisible?: boolean;
  isLocationVisible?: boolean;
  availableForWork?: boolean;
};

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess(false);
    const data = new FormData(event.currentTarget);
    const body = {
      fullName: String(data.get("fullName") ?? ""),
      headline: String(data.get("headline") ?? ""),
      shortBio: String(data.get("shortBio") ?? ""),
      longBio: String(data.get("longBio") ?? ""),
      location: String(data.get("location") ?? ""),
      email: String(data.get("email") ?? ""),
      phone: String(data.get("phone") ?? ""),
      isPhoneVisible: data.has("isPhoneVisible"),
      isEmailVisible: data.has("isEmailVisible"),
      isLocationVisible: data.has("isLocationVisible"),
      availableForWork: data.has("availableForWork"),
    };
    const response = await fetch("/api/admin/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(result.error ?? "Profil kaydedilemedi.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <form className="project-form" onSubmit={submit}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && <p className="field-note">Profil kaydedildi.</p>}
      <fieldset>
        <legend>Temel bilgiler</legend>
        <div className="form-grid">
          <label className="form-field">
            <span>Ad soyad</span>
            <input required minLength={2} maxLength={120} name="fullName" defaultValue={initial.fullName} />
          </label>
          <label className="form-field">
            <span>Unvan / headline</span>
            <input required minLength={2} maxLength={160} name="headline" defaultValue={initial.headline} />
          </label>
          <label className="form-field form-span">
            <span>Hero Kısa Tanıtımı</span>
            <textarea required minLength={10} maxLength={600} name="shortBio" defaultValue={initial.shortBio} />
            <small className="field-note">Ana sayfanın en üst bölümünde bir kez gösterilir.</small>
          </label>
          <label className="form-field form-span">
            <span>Hakkımda (opsiyonel)</span>
            <textarea maxLength={4_000} name="longBio" defaultValue={initial.longBio ?? ""} />
            <small className="field-note">Ana sayfadaki Hakkımda bölümünde kullanılır. Ayrı CV özeti yazılmazsa CV&apos;ye de aktarılır.</small>
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>İletişim ve görünürlük</legend>
        <p className="field-note">Gizli işaretlenen alanlar hiçbir zaman public CV/DTO&apos;ya, PDF&apos;e veya HTML&apos;e gönderilmez.</p>
        <div className="form-grid">
          <label className="form-field">
            <span>Konum</span>
            <input maxLength={120} name="location" defaultValue={initial.location ?? ""} />
          </label>
          <label className="form-field">
            <span>E-posta</span>
            <input type="email" maxLength={200} name="email" defaultValue={initial.email ?? ""} />
          </label>
          <label className="check-field">
            <input type="checkbox" name="isEmailVisible" defaultChecked={initial.isEmailVisible} /> E-postayı public CV&apos;de göster
          </label>
          <label className="form-field">
            <span>Telefon (opsiyonel)</span>
            <input type="tel" maxLength={40} name="phone" defaultValue={initial.phone ?? ""} />
          </label>
          <label className="check-field">
            <input type="checkbox" name="isPhoneVisible" defaultChecked={initial.isPhoneVisible} /> Telefonu sitede ve CV&apos;de göster
          </label>
          <label className="check-field">
            <input type="checkbox" name="isLocationVisible" defaultChecked={initial.isLocationVisible} /> Konumu public CV&apos;de göster
          </label>
          <label className="check-field">
            <input type="checkbox" name="availableForWork" defaultChecked={initial.availableForWork} /> Yeni fırsatlara açık
          </label>
        </div>
      </fieldset>
      <div className="form-actions">
        <button className="button button-primary" disabled={pending} type="submit">
          {pending ? "Kaydediliyor…" : "Profili kaydet"}
        </button>
      </div>
    </form>
  );
}
