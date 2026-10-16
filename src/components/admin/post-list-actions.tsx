"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PostStateButton({ id, nextStatus, children }: { id: string; nextStatus: "draft" | "published"; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function update() {
    setPending(true);
    const response = await fetch(`/api/admin/posts/${id}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setPending(false);
    if (response.ok) router.refresh();
    else alert("Durum güncellenemedi.");
  }
  return (
    <button className="text-button" type="button" disabled={pending} onClick={update}>
      {pending ? "Kaydediliyor…" : children}
    </button>
  );
}

export function DeletePostButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function remove() {
    if (!window.confirm(`“${title}” yazısını silmek istediğinizden emin misiniz?`)) return;
    setPending(true);
    const response = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setPending(false);
    if (response.ok) router.refresh();
    else alert("Yazı silinemedi.");
  }
  return (
    <button className="text-button danger" type="button" disabled={pending} onClick={remove}>
      {pending ? "Siliniyor…" : "Sil"}
    </button>
  );
}
