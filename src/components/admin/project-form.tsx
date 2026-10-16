"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { toSlug } from "@/features/projects/validation";

type Skill = { id: string; name: string; category: string };
type Initial = {
  id?: string; title?: string; slug?: string; shortDescription?: string; detailedDescription?: string | null;
  problem?: string | null; solution?: string | null; role?: string | null; architectureDescription?: string | null;
  status?: string; projectDate?: string | null; liveUrl?: string | null; repositoryVisibility?: string;
  repositoryUrl?: string | null; featured?: boolean; published?: boolean; includeInCv?: boolean; skillIds?: string[];
};

export function ProjectForm({ initial = {}, skills }: { initial?: Initial; skills: Skill[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug));
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [visibility, setVisibility] = useState(initial.repositoryVisibility ?? "none");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    const body = {
      title: String(data.get("title") ?? ""), slug: String(data.get("slug") ?? ""),
      shortDescription: String(data.get("shortDescription") ?? ""), detailedDescription: String(data.get("detailedDescription") ?? ""),
      problem: String(data.get("problem") ?? ""), solution: String(data.get("solution") ?? ""), role: String(data.get("role") ?? ""),
      architectureDescription: String(data.get("architectureDescription") ?? ""), status: String(data.get("status") ?? "planned"),
      projectDate: String(data.get("projectDate") ?? ""), liveUrl: String(data.get("liveUrl") ?? ""),
      repositoryVisibility: String(data.get("repositoryVisibility") ?? "none"), repositoryUrl: String(data.get("repositoryUrl") ?? ""),
      featured: data.has("featured"), published: data.has("published"), includeInCv: data.has("includeInCv"), skillIds: data.getAll("skillIds").map(String),
    };
    const response = await fetch(initial.id ? `/api/admin/projects/${initial.id}` : "/api/admin/projects", { method: initial.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({})); setPending(false);
    if (!response.ok) { setError(result.error ?? "Proje kaydedilemedi."); return; }
    router.push(`/admin/projects/${result.id}/edit`); router.refresh();
  }

  return <form className="project-form" onSubmit={submit}>
    {error && <p className="form-error" role="alert">{error}</p>}
    <fieldset><legend>Temel bilgiler</legend><div className="form-grid">
      <label className="form-field"><span>Başlık</span><input required minLength={2} maxLength={120} name="title" defaultValue={initial.title} onChange={(event) => { if (!slugEdited) setSlug(toSlug(event.target.value)); }} /></label>
      <label className="form-field"><span>Slug</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} /></label>
      <label className="form-field form-span"><span>Kısa açıklama</span><textarea required minLength={10} maxLength={320} name="shortDescription" defaultValue={initial.shortDescription} /></label>
      <label className="form-field form-span"><span>Detaylı açıklama</span><textarea name="detailedDescription" defaultValue={initial.detailedDescription ?? ""} /></label>
      <label className="form-field form-span"><span>Problem</span><textarea name="problem" defaultValue={initial.problem ?? ""} /></label>
      <label className="form-field form-span"><span>Çözüm</span><textarea name="solution" defaultValue={initial.solution ?? ""} /></label>
      <label className="form-field"><span>Rol</span><input name="role" maxLength={500} defaultValue={initial.role ?? ""} /></label>
      <label className="form-field"><span>Proje tarihi</span><input type="date" name="projectDate" defaultValue={initial.projectDate ?? ""} /></label>
      <label className="form-field form-span"><span>Mimari açıklama</span><textarea name="architectureDescription" defaultValue={initial.architectureDescription ?? ""} /></label>
    </div></fieldset>
    <fieldset><legend>Yayın ve bağlantılar</legend><div className="form-grid">
      <label className="form-field"><span>Durum</span><select name="status" defaultValue={initial.status ?? "planned"}><option value="planned">Planlandı</option><option value="in_progress">Devam ediyor</option><option value="completed">Tamamlandı</option><option value="archived">Arşivlendi</option></select></label>
      <label className="form-field"><span>Canlı URL</span><input type="url" name="liveUrl" defaultValue={initial.liveUrl ?? ""} /></label>
      <label className="form-field"><span>Repository görünürlüğü</span><select name="repositoryVisibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="none">Yok</option><option value="private">Private</option><option value="public">Public</option></select></label>
      <label className="form-field"><span>Repository URL</span><input type="url" name="repositoryUrl" disabled={visibility === "none"} defaultValue={initial.repositoryUrl ?? ""} /></label>
      <label className="check-field"><input type="checkbox" name="featured" defaultChecked={initial.featured} /> Öne çıkan</label>
      <label className="check-field"><input type="checkbox" name="published" defaultChecked={initial.published} /> Yayınla</label>
      <label className="check-field"><input type="checkbox" name="includeInCv" defaultChecked={initial.includeInCv} /> CV&apos;de göster</label>
    </div></fieldset>
    <fieldset><legend>Yetenekler / teknolojiler</legend>{skills.length ? <div className="skill-options">{skills.map((skill) => <label className="check-field" key={skill.id}><input type="checkbox" name="skillIds" value={skill.id} defaultChecked={initial.skillIds?.includes(skill.id)} /><span>{skill.name}<small>{skill.category}</small></span></label>)}</div> : <p className="field-note">Henüz skill kaydı yok. Proje skillsiz kaydedilebilir.</p>}</fieldset>
    <div className="form-actions"><button className="button button-primary" disabled={pending} type="submit">{pending ? "Kaydediliyor…" : initial.id ? "Değişiklikleri kaydet" : "Projeyi oluştur"}</button><button className="button button-secondary" type="button" onClick={() => router.push("/admin/projects")}>İptal</button></div>
  </form>;
}
