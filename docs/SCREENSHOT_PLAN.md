# Final Ekran Görüntüsü Planı — 1.9.0

Bu plan final rapor ([FINAL_REPORT](FINAL_REPORT.md)) ve sunum ([PRESENTATION_OUTLINE](PRESENTATION_OUTLINE.md)) için gereken görselleri listeler.

**Durum (2026-10-15):** Görüntülerin çoğu gerçek yerel uygulama ve gerçek `local.db` içeriğiyle alınmış ve `docs/screenshots/` altına kaydedilmiştir (1.8.4 arayüzü; tarayıcı çerçevesi kırpılmış, DPR 1, masaüstü 1440×900, mobil 390×844). Uydurma veya düzenlenmiş görüntü yoktur. Yalnız gizlilik maskelemesi uygulanmıştır: admin e-postası ve özel depo URL alanı bulanıklaştırılmıştır.

**1.9.0 etkisi:** Birincil public CV artık yöneticinin yüklediği profesyonel PDF'tir (ADR-095); SS-11/SS-11b bu PDF yüklendikten sonra alınmıştır. 1.9.0 arayüz değişikliklerinden etkilenen `04`, `04b`, `13a`, `13c` ve `20` aynı kurallarla yeniden alınmıştır.

## Genel kurallar

- **Masaüstü:** 1440×900 CSS px, %100 zoom.
- **Mobil:** 390×844 (gerekirse 375×812) tarayıcı emülasyonu. Rapor ve slaytta "mobil görünüm (tarayıcı emülasyonu)" diye etiketlenir; gerçek telefon diye sunulmaz.
- **Tarayıcı çerçevesi:** Adres çubuğu, sekmeler, uzantılar kırpılır. Next.js geliştirme göstergesi gizlenir.
- **Tema:** Karanlık tema.
- **Hareket:** Data Spine görüntüleri hareket açıkken, sahne oturduktan sonra alınır.
- **Asla kadraja girmemeli:** `.env.local` içeriği, R2 Account ID / Access Key / Secret, Turso token, Better Auth secret, presigned URL imza parametreleri (`X-Amz-Signature`, `X-Amz-Credential`), R2 nesne anahtarları, tarayıcı otomatik doldurma önerileri, kayıtlı parolalar, yerel kullanıcı klasörü yolları.
- **Kişisel veri:** Gerçek telefon/e-posta yalnız görünürlüğü bilinçli olarak açık bilgilerse görünebilir. Admin araç çubuğundaki giriş e-postası bulanıklaştırılır.

## Ekran görüntüleri

Durum: ✅ alındı · 🔁 1.9.0 değişikliği nedeniyle yeniden alınmalı · ⏳ manuel adımdan sonra alınacak · ○ isteğe bağlı

| No | Dosya | Ekran / sayfa | Cihaz | Rapor | Sunum | Durum |
| --- | --- | --- | --- | --- | --- | --- |
| SS-01 | `01-hero-desktop.png` | Açılış — Hero / Data Spine | Masaüstü | Şekil 14 (Bölüm 19) | Slayt 1, 9 | ✅ |
| SS-02 | `02-data-spine-projects.png` | Projects pinned sahne, kart açık (tek proje olduğu için "sonraki kartlar kapalı" durumu yok) | Masaüstü | Bölüm 19 (isteğe bağlı) | Slayt 9 | ✅ |
| SS-03 | `03-certificates-section.png` | Açılış sertifikaları (landing en fazla 4 gösterir), "Doğrula" bağlantıları | Masaüstü | Şekil 8 (Bölüm 13) | Slayt 7 | ✅ |
| SS-04 | `04-project-detail.png`, `04b-project-detail-fullpage.png` | Proje vaka çalışması, R2 kapak | Masaüstü | Şekil 5 (Bölüm 10, 18) | Slayt 7, 10 | ✅ 1.9.0 arayüzüyle yeniden alındı (Türkçe etiketler) |
| SS-05 | `05-admin-dashboard.png` | Admin Dashboard | Masaüstü | Şekil 3 (Bölüm 9) | Slayt 6 | ✅ e-posta maskeli |
| SS-06 | `06-admin-project-edit.png`, `06b-admin-project-edit-fullpage.png` | Project CMS; yayın / CV'de göster / depo görünürlüğü / medya | Masaüstü | Şekil 4 (Bölüm 10) | Slayt 6, 7 | ✅ e-posta ve özel depo URL'si maskeli |
| SS-07 | `07-admin-blog-edit.png`, `07b-admin-blog-edit-fullpage.png` | Blog CMS, Tiptap, kategori/etiket | Masaüstü | Şekil 6 (Bölüm 11) | Slayt 7 | ✅ e-posta maskeli |
| SS-08 | `08-admin-certificates.png`, `08b-admin-certificates-fullpage.png` | Sertifika listesi, sıralama, görünürlük bayrakları | Masaüstü | Şekil 7 (Bölüm 13) | Slayt 7 | ✅ e-posta maskeli |
| SS-09 | `09-r2-media-cover-existing.png` | R2 medya alanı: **mevcut** kapak kaydı (küçük resim + alt metin). Yeni yükleme yapılmadı. | Masaüstü | Şekil 13 (Bölüm 18) | Slayt 10 | ✅ "mevcut yükleme kaydı" olarak etiketlenmeli |
| SS-10 | `10-web-cv.png` | Web CV `/cv` (yapılandırılmış veri) | Masaüstü | Şekil 9 (Bölüm 14) | Yedek / Slayt 8 | ✅ 1.9.0; destekleyici |
| SS-11 | `11-professional-cv-pdf-fit.png` (rapor/sunum), `11-professional-cv-pdf.png` (navbar tıklamasıyla açılan sekme) | **Yüklenen profesyonel PDF CV**, `/api/cv/pdf`, Chrome PDF görüntüleyicisinde `inline` | Masaüstü | Şekil 10 (Bölüm 15.3) | Slayt 8 | ✅ alındı; içerik kullanıcının yayımladığı CV'dir |
| SS-11b | `11b-admin-professional-cv.png`, `11c-admin-cv-page.png` | Admin "Profesyonel CV PDF": Durum **Yüklendi**, `web_cv.pdf`, 333,9 KB, 15 Ekim 2026 19:37; Aç/İndir/Değiştir | Masaüstü | Bölüm 15.3 | Slayt 8 | ✅ alındı; e-posta maskeli. Not: yönetici oturumu için `local.db`'nin salt okunur yedek kopyası ve geçici bir QA admini kullanıldı; gerçek `local.db` değişmedi, kopya silindi |
| SS-12 | `12-admin-ats-check.png` | Admin — ATS Uyumluluk Kontrolü (83/100: özet eksik, yetenek az) | Masaüstü | Şekil 11 (Bölüm 15.2) | Yedek slayt | ✅ isteğe bağlı/dahili |
| SS-13 | `13a-mobile-hero.png`, `13b-mobile-certificates.png`, `13c-mobile-contact.png` | Mobil Hero, Sertifikalar, İletişim | Mobil 390 px | Şekil 15 (Bölüm 21) | Slayt 9 veya 14 | ✅ `13a` ve `13c` 1.9.0 arayüzüyle yeniden alındı (hero aralığı düzeltildi, İletişim'de "CV (PDF)"); `13b` ✅ |
| SS-14 | `14-command-palette.png` | Ctrl+K komut paleti | Masaüstü | Bölüm 20 (isteğe bağlı) | Yedek slayt | ✅ |
| SS-15 | — | Test özeti | — | Şekil 16 (Bölüm 26) | Slayt 13 | ✅ tablo/grafik olarak karşılandı (terminal görüntüsü yerine gerçek komut sonuçlarından derlenen sonuç tablosu) |
| SS-16 | — | Güvenlik kanıtı (terminal) | — | Bölüm 23 (isteğe bağlı) | Slayt 12 | ○ alınmadı; D-05 önce/sonra diyagramı ve metin kullanılıyor |
| — | `20-projects-page.png`, `21-blog-page.png`, `22-blog-detail.png` | Proje listesi, blog listesi, blog detayı | Masaüstü | — | — | ✅ ek görseller (`20` 1.9.0 arayüzüyle yeniden alındı) |

## Diyagramlar (ekran görüntüsü değil)

Diyagramlar Mermaid kaynaklarından veya slayt aracında yeniden çizilerek üretilir. Uydurma ekran görüntüsü olarak sunulmaz.

| No | Diyagram | Kaynak | Rapor | Sunum |
| --- | --- | --- | --- | --- |
| D-01 | Sistem mimarisi | FINAL_REPORT Bölüm 7 Mermaid | Şekil 1 | Slayt 5 |
| D-02 | ER diyagramı | FINAL_REPORT Bölüm 8 Mermaid | Şekil 2 | — (gerekirse yedek slayt) |
| D-03 | R2 yükleme sequence diyagramı | FINAL_REPORT Bölüm 18 Mermaid | Şekil 12 | Slayt 10 |
| D-04 | Güvenlik katmanları (istek → auth → rol → origin → Zod → DB/R2) | Slayt aracında çizilir | — | Slayt 11 |
| D-05 | RSC bulgusu: önce / sonra (layout-only vs. page-level guard) | Slayt aracında çizilir | Bölüm 23 (isteğe bağlı) | Slayt 12 |
| D-06 | CV akışı: yüklenen profesyonel PDF (birincil) / DB → PublicCvData → Web CV + üretilen PDF (yedek) + ATS | FINAL_REPORT Bölüm 15.3 metin şeması | — | Slayt 8 |

## Durum

Tüm zorunlu görüntüler alınmıştır (2026-10-15). Migration uygulanmış ve profesyonel PDF yüklenmiştir; SS-11 ve SS-11b gerçek veriyle alınmıştır.

## Açık kontroller (tamamlanmış sayılmaz)

- Gerçek %200 tarayıcı zoom, OS reduced-motion emülasyonu ve native yazdırma önizlemesi
- Fiziksel cihaz / Safari ve ekran okuyucu
- Production deploy, custom domain ve canlı HTTPS — production ekran görüntüsü beklenmez
- Alt yazılar Word aşamasında okul şablonuna göre "Şekil X.Y — …" biçiminde numaralandırılır
