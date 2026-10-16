"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { formatCvFileSize, maxCvPdfBytes } from "@/features/cv/uploaded-pdf";

type ActiveCv = { originalName: string; size: number; uploadedAt: string | null } | null;

const dateFormatter = new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" });

// UX-only pre-check; the server re-validates MIME, size and the %PDF- signature on finalize.
async function looksLikePdf(file: File) {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...header) === "%PDF-";
}

export function CvPdfManager({ active, storageConfigured, schemaReady = true }: { active: ActiveCv; storageConfigured: boolean; schemaReady?: boolean }) {
  const uploadEnabled = storageConfigured && schemaReady;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || !file.size) return setError("Bir PDF dosyası seçin.");
    if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name) || file.size > maxCvPdfBytes) {
      return setError("Yalnızca PDF dosyası ve en fazla 5 MB kabul edilir.");
    }
    if (!(await looksLikePdf(file))) return setError("Seçilen dosya geçerli bir PDF değil.");
    if (active && !window.confirm("Mevcut profesyonel CV yeni dosyayla değiştirilecek. Devam edilsin mi?")) return;

    setPending(true);
    try {
      const presignResponse = await fetch("/api/admin/cv/pdf/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type, size: file.size }),
      });
      const presign = await presignResponse.json();
      if (!presignResponse.ok) throw new Error(presign.error ?? "Yükleme bağlantısı alınamadı.");
      const storageError = "Dosya depolamaya yüklenemedi. Bağlantıyı ve bucket CORS ayarını kontrol edin. Mevcut CV değişmedi.";
      // A blocked/failed network request rejects (e.g. "Failed to fetch") instead of returning !ok.
      const uploadResponse = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file }).catch(() => null);
      if (!uploadResponse?.ok) throw new Error(storageError);
      const finalizeResponse = await fetch("/api/admin/cv/pdf/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadToken: presign.uploadToken }),
      });
      const finalized = await finalizeResponse.json();
      if (!finalizeResponse.ok) throw new Error(finalized.error ?? "Yükleme doğrulanamadı.");
      form.reset();
      setNotice("Profesyonel CV etkinleştirildi. Ziyaretçiler artık bu PDF'i görür.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yükleme tamamlanamadı. Mevcut CV değişmedi.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setError("");
    setNotice("");
    if (!window.confirm("Profesyonel CV kaldırılacak ve ziyaretçilere otomatik oluşturulan PDF gösterilecek. Emin misiniz?")) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/cv/pdf", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setNotice("Profesyonel CV kaldırıldı; otomatik oluşturulan PDF kullanılıyor.");
      router.refresh();
    } catch {
      setError("Profesyonel CV kaldırılamadı.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="media-manager cv-pdf-manager" aria-labelledby="cv-pdf-title">
      <div>
        <p className="eyebrow">Birincil CV</p>
        <h2 id="cv-pdf-title">Profesyonel CV PDF</h2>
        <p>
          Yüklenen PDF, ziyaretçilerin &quot;CV&quot; bağlantısında açılan birincil özgeçmiştir. Yüklenmezse yapılandırılmış
          verilerden otomatik oluşturulan PDF yedek olarak sunulur. Yalnızca PDF, en fazla 5 MB.
        </p>
      </div>

      <dl className="cv-pdf-status" aria-live="polite">
        <div>
          <dt>Durum</dt>
          <dd>{active ? <span className="status-pill status-pill--ok">Yüklendi</span> : <span className="status-pill">Yüklenmedi</span>}</dd>
        </div>
        {active ? (
          <>
            <div><dt>Dosya adı</dt><dd>{active.originalName}</dd></div>
            <div><dt>Boyut</dt><dd>{formatCvFileSize(active.size)}</dd></div>
            <div><dt>Yüklenme tarihi</dt><dd>{active.uploadedAt ? dateFormatter.format(new Date(active.uploadedAt)) : "—"}</dd></div>
          </>
        ) : (
          <div><dt>Şu an sunulan</dt><dd>Otomatik oluşturulan PDF (yedek)</dd></div>
        )}
      </dl>

      <div className="table-actions">
        <a className="button button-primary" href="/api/cv/pdf" target="_blank" rel="noopener">CV&apos;yi Aç</a>
        <a className="button button-secondary" href="/api/cv/pdf?download=1">İndir</a>
      </div>

      {!schemaReady && <p className="form-error" role="status">Veritabanı 1.9.0 migration&apos;ı uygulanmamış. <code>npm run db:migrate</code> çalıştırıldıktan sonra PDF yüklenebilir.</p>}
      {schemaReady && !storageConfigured && <p className="field-note" role="status">PDF yükleme için R2 depolaması yapılandırılmalıdır.</p>}
      <form className="media-upload" onSubmit={upload}>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        <label className="form-field">
          <span>{active ? "Yeni PDF seç" : "PDF seç"}</span>
          <input required disabled={!uploadEnabled || pending} type="file" name="file" accept="application/pdf,.pdf" />
        </label>
        <button className="button button-primary" disabled={pending || !uploadEnabled} type="submit">
          {pending ? "İşleniyor…" : active ? "Değiştir / Yeni PDF Yükle" : "PDF Yükle"}
        </button>
      </form>

      {active && (
        <div className="table-actions">
          <button className="text-button danger" type="button" disabled={pending} onClick={remove}>
            Profesyonel CV&apos;yi kaldır
          </button>
        </div>
      )}
    </section>
  );
}
