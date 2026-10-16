"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { imageDeliveryUrl } from "@/features/media/delivery-url";

type Cover = { url: string | null; altText: string } | null;

async function dimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch {
    return { width: null, height: null };
  }
}

export function PostCoverManager({ postId, cover, storageConfigured }: { postId: string; cover: Cover; storageConfigured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size) return setError("Bir görsel seçin.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      return setError("Yalnızca JPEG, PNG veya WebP ve en fazla 5 MB dosya kabul edilir.");
    }
    setPending(true);
    try {
      const presignResponse = await fetch(`/api/admin/posts/${postId}/uploads/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, size: file.size }),
      });
      const presign = await presignResponse.json();
      if (!presignResponse.ok) throw new Error(presign.error ?? "Upload URL alınamadı.");
      const uploadResponse = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadResponse.ok) throw new Error("Dosya R2'ye yüklenemedi. Bucket CORS ayarını kontrol edin.");
      const size = await dimensions(file);
      const finalizeResponse = await fetch(`/api/admin/posts/${postId}/uploads/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadToken: presign.uploadToken, altText: String(data.get("altText") ?? ""), ...size }),
      });
      const finalized = await finalizeResponse.json();
      if (!finalizeResponse.ok) throw new Error(finalized.error ?? "Upload doğrulanamadı.");
      form.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload tamamlanamadı.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm("Cover görselini kaldırmak istediğinizden emin misiniz?")) return;
    const response = await fetch(`/api/admin/posts/${postId}/cover`, { method: "DELETE" });
    if (response.ok) router.refresh();
    else setError("Cover görseli kaldırılamadı.");
  }

  return (
    <section className="media-manager" aria-labelledby="cover-title">
      <div>
        <p className="eyebrow">R2 medya</p>
        <h2 id="cover-title">Cover görseli</h2>
        <p>JPEG, PNG veya WebP; en fazla 5 MB. Alt metin zorunludur.</p>
      </div>
      {!storageConfigured && <p className="field-note" role="status">Medya yükleme için R2 depolaması yapılandırılmalıdır. Yazı içeriğini düzenlemeye devam edebilirsiniz.</p>}
      <form className="media-upload" onSubmit={upload}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label className="form-field">
          <span>Dosya</span>
          <input required disabled={!storageConfigured} type="file" name="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <label className="form-field">
          <span>Alt metin</span>
          <input required disabled={!storageConfigured} minLength={3} maxLength={300} name="altText" />
        </label>
        <button className="button button-primary" disabled={pending || !storageConfigured} type="submit">
          {pending ? "Yükleniyor…" : "Cover'ı yükle"}
        </button>
      </form>
      <div className="media-group">
        {cover?.url ? (
          <article className="media-item">
            <div className="media-thumb">
              <Image alt={cover.altText} src={imageDeliveryUrl(cover.url)} fill sizes="160px" />
            </div>
            <div>
              <strong>{cover.altText}</strong>
              <div className="table-actions">
                <button className="danger" type="button" onClick={remove}>
                  Cover&apos;ı kaldır
                </button>
              </div>
            </div>
          </article>
        ) : (
          <p className="field-note">Cover görseli yok; kartlarda profesyonel fallback gösterilir.</p>
        )}
      </div>
    </section>
  );
}
