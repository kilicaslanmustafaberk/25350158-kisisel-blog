"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { imageDeliveryUrl } from "@/features/media/delivery-url";

type Item = { id: string; type: "cover" | "gallery"; altText: string; caption: string | null; url: string | null; width: number | null; height: number | null };

async function dimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  } catch { return { width: null, height: null }; }
}

export function ProjectMediaManager({ projectId, images, storageConfigured }: { projectId: string; images: Item[]; storageConfigured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget; const data = new FormData(form); const file = data.get("file");
    if (!(file instanceof File) || !file.size) return setError("Bir görsel seçin.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) return setError("Yalnızca JPEG, PNG veya WebP ve en fazla 5 MB dosya kabul edilir.");
    setPending(true);
    try {
      const presignResponse = await fetch(`/api/admin/projects/${projectId}/uploads/presign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mimeType: file.type, size: file.size }) });
      const presign = await presignResponse.json();
      if (!presignResponse.ok) throw new Error(presign.error ?? "Upload URL alınamadı.");
      const uploadResponse = await fetch(presign.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadResponse.ok) throw new Error("Dosya R2'ye yüklenemedi. Bucket CORS ayarını kontrol edin.");
      const size = await dimensions(file);
      const finalizeResponse = await fetch(`/api/admin/projects/${projectId}/uploads/finalize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadToken: presign.uploadToken, altText: String(data.get("altText") ?? ""), caption: String(data.get("caption") ?? ""), type: String(data.get("type") ?? "gallery"), ...size }) });
      const finalized = await finalizeResponse.json();
      if (!finalizeResponse.ok) throw new Error(finalized.error ?? "Upload doğrulanamadı.");
      form.reset(); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload tamamlanamadı."); }
    finally { setPending(false); }
  }

  async function mutate(imageId: string, method: "DELETE" | "PATCH", body?: object) {
    const response = await fetch(`/api/admin/projects/${projectId}/images/${imageId}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    if (response.ok) router.refresh(); else setError("Görsel işlemi tamamlanamadı.");
  }

  const cover = images.find((image) => image.type === "cover");
  const gallery = images.filter((image) => image.type === "gallery");
  return <section className="media-manager" aria-labelledby="media-title">
    <div><p className="eyebrow">R2 medya</p><h2 id="media-title">Cover ve galeri</h2><p>JPEG, PNG veya WebP; en fazla 5 MB. Alt metin zorunludur.</p></div>
    {!storageConfigured && <p className="field-note" role="status">Medya yükleme için R2 depolaması yapılandırılmalıdır. Proje içeriğini düzenlemeye devam edebilirsiniz.</p>}
    <form className="media-upload" onSubmit={upload}>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label className="form-field"><span>Dosya</span><input required disabled={!storageConfigured} type="file" name="file" accept="image/jpeg,image/png,image/webp" /></label>
      <label className="form-field"><span>Tür</span><select name="type" disabled={!storageConfigured}><option value="cover">Cover</option><option value="gallery">Galeri</option></select></label>
      <label className="form-field"><span>Alt metin</span><input required disabled={!storageConfigured} minLength={3} maxLength={300} name="altText" /></label>
      <label className="form-field"><span>Caption (opsiyonel)</span><input disabled={!storageConfigured} maxLength={500} name="caption" /></label>
      <button className="button button-primary" disabled={pending || !storageConfigured} type="submit">{pending ? "Yükleniyor…" : "Görseli yükle"}</button>
    </form>
    <div className="media-group"><h3>Cover</h3>{cover ? <MediaItem item={cover} onRemove={() => mutate(cover.id, "DELETE")} /> : <p className="field-note">Cover görseli yok; public kartlarda profesyonel fallback gösterilir.</p>}</div>
    <div className="media-group"><h3>Galeri</h3>{gallery.length ? <div className="media-list">{gallery.map((item, index) => <MediaItem key={item.id} item={item} onRemove={() => mutate(item.id, "DELETE")} controls={<><button type="button" disabled={index === 0} onClick={() => mutate(item.id, "PATCH", { direction: "up" })}>Yukarı</button><button type="button" disabled={index === gallery.length - 1} onClick={() => mutate(item.id, "PATCH", { direction: "down" })}>Aşağı</button></>} />)}</div> : <p className="field-note">Galeri görseli yok.</p>}</div>
  </section>;
}

function MediaItem({ item, onRemove, controls }: { item: Item; onRemove: () => void; controls?: React.ReactNode }) {
  return <article className="media-item">{item.url ? <div className="media-thumb"><Image alt={item.altText} src={imageDeliveryUrl(item.url)} fill sizes="160px" /></div> : <div className="media-thumb media-fallback">Önizleme yok</div>}<div><strong>{item.altText}</strong>{item.caption && <p>{item.caption}</p>}<div className="table-actions">{controls}<button className="danger" type="button" onClick={onRemove}>İlişkiyi kaldır</button></div></div></article>;
}
