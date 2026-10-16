import assert from "node:assert/strict";
import { createClient } from "@libsql/client";

// Optional browser fixture for Phase 18 (certificates + contact spacing). Disposable DB only.
const url = process.env.TURSO_DATABASE_URL;
assert.match(url ?? "", /^file:\.\/\.phase10-\d+\.db$/);
const client = createClient({ url });
try {
  assert.equal((await client.execute("SELECT id FROM profiles WHERE id = 'primary'")).rows.length, 1);
  const now = Math.floor(Date.now() / 1000);
  await client.execute("UPDATE profiles SET email = 'iletisim@example.com', is_email_visible = 1, phone = '+90 555 010 20 30', is_phone_visible = 1 WHERE id = 'primary'");
  const links = [["github", "GitHub", "https://github.com/octocat", 1], ["instagram", "Instagram", "https://www.instagram.com/example", 0], ["linkedin", "LinkedIn", "https://www.linkedin.com/in/example", 1]];
  for (const [index, [platform, label, link, cv]] of links.entries()) {
    await client.execute({ sql: "INSERT OR REPLACE INTO social_links (id, profile_id, platform, label, url, display_order, is_visible, show_in_cv, created_at, updated_at) VALUES (?, 'primary', ?, ?, ?, ?, 1, ?, ?, ?)", args: [`phase18-link-${index}`, platform, label, link, index, cv, now, now] });
  }
  const certificates = [
    ["İleri Seviye Ağ Teknolojileri", "BTK Akademi", "Öğrenci Eğitmen", "2026-03-15", null, "BTK-2026-0042", "https://www.btkakademi.gov.tr/portal/certificate/validate", 1],
    ["Next.js ile Modern Web Uygulamaları", "Udemy", null, "2025-11-02", null, null, null, 1],
    ["Google Cloud Temelleri: Çekirdek Altyapı", "Google", null, "2025-06-20", "2028-06-20", "GCP-7781", "https://www.credential.net/example", 1],
    ["Siber Güvenliğe Giriş", null, null, null, null, null, null, 0],
  ];
  for (const [index, [title, issuer, instructor, issued, expires, credentialId, credentialUrl, cv]] of certificates.entries()) {
    await client.execute({ sql: "INSERT OR REPLACE INTO certificates (id, title, issuer, instructor, issued_at, expires_at, credential_id, credential_url, description, is_visible, show_in_cv, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?, ?, ?)", args: [`phase18-cert-${index}`, title, issuer, instructor, issued, expires, credentialId, credentialUrl, cv, index, now, now] });
  }
  await client.execute({ sql: "INSERT OR REPLACE INTO certificates (id, title, is_visible, show_in_cv, display_order, created_at, updated_at) VALUES ('phase18-cert-hidden', 'Gizli Taslak Sertifika', 0, 1, 9, ?, ?)", args: [now, now] });
  console.log("Phase 18 disposable visual fixture: four visible certificates, one hidden, contact rows.");
} finally { client.close(); }
