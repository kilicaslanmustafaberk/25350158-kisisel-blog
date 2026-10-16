"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProjectStateButton({ id, field, value, children }: { id: string; field: "published" | "featured" | "includeInCv"; value: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function update() {
    setPending(true);
    const response = await fetch(`/api/admin/projects/${id}/state`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ field, value }) });
    setPending(false);
    if (response.ok) router.refresh(); else alert("Durum güncellenemedi.");
  }
  return <button className="text-button" type="button" disabled={pending} onClick={update}>{pending ? "Kaydediliyor…" : children}</button>;
}

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function remove() {
    if (!window.confirm(`“${title}” projesini silmek istediğinizden emin misiniz? Proje ilişkileri silinir; R2/media kayıtları korunur.`)) return;
    setPending(true);
    const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    setPending(false);
    if (response.ok) router.refresh(); else alert("Proje silinemedi.");
  }
  return <button className="text-button danger" type="button" disabled={pending} onClick={remove}>{pending ? "Siliniyor…" : "Sil"}</button>;
}
