# Final Sunum Taslağı — 1.9.0

14 slayt, hedef süre 7–10 dakika (slayt anlatımı yaklaşık 8 dakika; canlı demo ayrı ve 3–4 dakika). Ayrıntılı konuşma metni [PRESENTATION_SPEAKER_NOTES](PRESENTATION_SPEAKER_NOTES.md), demo akışı [DEMO_SCRIPT](DEMO_SCRIPT.md), olası sorular [JURY_QA](JURY_QA.md), görseller [SCREENSHOT_PLAN](SCREENSHOT_PLAN.md) içindedir.

## Tasarım yönergesi

- **Tema:** Koyu, teknik ve sade; sitenin görsel diliyle uyumlu. Koyu arka plan, açık metin, tek bir vurgu rengi (sitedeki omurga/core rengine yakın).
- **Yazı:** Başlıklar kısa; slayt başına en fazla 3–5 madde; paragraf yok.
- **Görsel öncelik:** Diyagram ve gerçek ekran görüntüsü, metin bloğundan önce gelir.
- **Kaçınılacaklar:** Emoji, yoğun gradyan, hazır kurumsal şablon görünümü, her slaytta kod bloğu, yapay zekâ aracı logosu veya markası, filigran.
- **Kod:** Yalnız Slayt 12'de 2–3 satırlık `await requireAdmin()` örneği kabul edilebilir.
- **Tutarlılık:** Tüm ekran görüntüleri aynı pencere boyutundan; tarayıcı çerçevesi kırpılmış.
- **Altbilgi:** Slayt numarası ve proje adı; sürüm yalnız kapakta ve test slaytında.

## Süre planı

| Slayt | Süre |
| --- | ---: |
| 1 Kapak | 0:20 |
| 2 Problem | 0:35 |
| 3 Amaç ve kapsam | 0:35 |
| 4 Teknoloji yığını | 0:30 |
| 5 Sistem mimarisi | 0:40 |
| 6 Admin ve dinamik içerik | 0:30 |
| 7 Proje, blog, sertifika | 0:40 |
| 8 CV, PDF, ATS | 0:40 |
| 9 Data Spine | 0:40 |
| 10 R2 medya sistemi | 0:45 |
| 11 Güvenlik mimarisi | 0:40 |
| 12 Kritik güvenlik bulgusu | 1:00 |
| 13 Test sonuçları | 0:30 |
| 14 Sonuç ve demo geçişi | 0:30 |
| **Toplam** | **~8:35** |

---

## Slayt 1 — Kişisel Vitrin ve Kariyer Yönetim Sistemi

- Dinamik portfolyo + kariyer içerik yönetimi
- Ankara Üniversitesi Nallıhan MYO — Bilgisayar Programcılığı bitirme projesi
- Mustafa Berk KILIÇASLAN (25350158) — Danışman: Öğr. Gör. Dr. Ufuk TANYERİ
- Sürüm 1.9.0

**Görsel:** Hero / Data Spine ekran görüntüsü, hafif karartılmış arka plan olarak.
**Ekran görüntüsü:** Evet — SS-01.
**Konuşmacı notu:** Kendini ve projeyi tek cümlede tanıt: "Bir geliştiricinin projelerini, yazılarını, sertifikalarını ve CV'sini tek panelden yönettiği kişisel bir vitrin." Kapakta bekleme.

## Slayt 2 — Problem: Statik Portfolyo Yetmiyor

- Her güncelleme = kod değişikliği
- Aynı bilgi site, CV ve PDF'de ayrı ayrı
- Taslak veya gizli bilginin yanlışlıkla yayımlanma riski
- Web CV ile PDF CV zamanla çelişiyor

**Görsel:** Solda dağınık kopyalar (site / Word CV / PDF), sağda tek veritabanından beslenen üç çıktı.
**Ekran görüntüsü:** Hayır — basit diyagram.
**Konuşmacı notu:** Kişisel deneyimle bağla: bir sertifika eklemek için üç yeri güncellemek gerekiyordu. Asıl risk, gizli bilginin yanlışlıkla yayına çıkması.

## Slayt 3 — Amaç ve Kapsam

- Tek panelden güvenli içerik yönetimi
- Tek veri kaynağı → site, web CV, yedek PDF; profesyonel PDF birincil CV
- Tek sahip, tek admin — SaaS değil
- Ziyaretçi kayıt olmaz, yalnız okur

**Görsel:** Modül haritası: Projeler, Blog, Sertifikalar, Eğitim/Deneyim, CV/PDF, Medya.
**Ekran görüntüsü:** Hayır.
**Konuşmacı notu:** "Neden SaaS değil?" sorusunu baştan cevapla: kayıt kapalı, tek admin; bu saldırı yüzeyini küçültüyor ve yetkilendirmeyi sadeleştiriyor.

## Slayt 4 — Teknoloji Yığını

- Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
- Turso/libSQL · Drizzle ORM · Zod
- Better Auth · Cloudflare R2
- Tiptap · React PDF · Anime.js · Three.js

**Görsel:** Dört katmanlı ızgara: Arayüz / Veri / Güvenlik-Depolama / İçerik-Görsel. Logo kullanılacaksa yalnız teknolojilerin kendi logoları.
**Ekran görüntüsü:** Hayır.
**Konuşmacı notu:** Her teknolojiyi tek tek anlatma. Üç seçimi gerekçelendir: Next.js (public + admin tek projede, sunucu öncelikli), Turso (yerelde tek dosya), Better Auth (kayıt kapatılabilir, uygulama içinde).

## Slayt 5 — Sistem Mimarisi

- Public akış: yalnız görünür ve yayımlanmış veri
- Admin akış: oturum → rol → origin → doğrulama
- Secret'lar yalnız sunucuda
- Görseller doğrudan R2'ye

**Görsel:** D-01 sistem mimarisi diyagramı (iki şerit: ziyaretçi ve admin).
**Ekran görüntüsü:** Hayır — diyagram.
**Konuşmacı notu:** İki güven sınırını göster. "Public tarafa veritabanı satırı değil, o sayfaya yetecek kadar küçük bir veri nesnesi gider."

## Slayt 6 — Admin Paneli ve Dinamik İçerik

- Dashboard + 9 ekran: proje, blog, profil, eğitim, deneyim, sertifika, yetenek, sosyal, CV
- Görünürlük, yayın ve sıralama kontrolü
- Değişiklik anında public sayfada
- İlk admin yalnız CLI ile; varsayılan parola yok

**Görsel:** Admin Dashboard ekran görüntüsü.
**Ekran görüntüsü:** Evet — SS-05 (e-posta bulanık).
**Konuşmacı notu:** Panelin teknik olmayan bir kullanıcı için tasarlandığını söyle. Formların gönderdiği veri doğrudan veritabanına yazılmaz; izinli alanlar seçilir.

## Slayt 7 — Proje, Blog ve Sertifika Yönetimi

- Proje: vaka çalışması, kapak/galeri, private repo koruması
- Blog: Tiptap JSON — HTML saklanmaz
- Sertifika: "Sitede göster" ve "CV'de göster" ayrı bayraklar
- Filtre SQL'de, istemcide değil

**Görsel:** Üçlü kesit — Project CMS (SS-06), Blog editörü (SS-07), Certificates admin (SS-08).
**Ekran görüntüsü:** Evet — SS-06, SS-07, SS-08 (gerekirse SS-03).
**Konuşmacı notu:** Tiptap JSON kararını tek cümleyle açıkla: yalnız bilinen yapıyı kabul ediyoruz, böylece script veya `javascript:` bağlantısı içeriğe giremiyor.

## Slayt 8 — CV, PDF ve ATS

- CV verisi yapılandırılmış ve dinamik; Web CV (`/cv`) bu veriden
- Ziyaretçinin "CV"si: yöneticinin yüklediği profesyonel PDF (birincil)
- Sistem ATS odaklı PDF'i de üretir → yükleme yoksa yedek
- Yükleme güvenli: yalnız PDF, ≤5 MB, `%PDF-` sunucuda doğrulanır
- Gizli alan sunucuda çıkarılır; ATS kontrolü veri kalitesi aracı

**Görsel:** D-06 akış şeması (yüklenen PDF → birincil; DB → Web CV + yedek PDF) + profesyonel PDF (SS-11) ve admin "Profesyonel CV PDF" bölümü (SS-11b).
**Ekran görüntüsü:** Evet — SS-11 ve SS-11b (kullanıcı PDF'i yükledikten sonra); isteğe bağlı SS-10.
**Konuşmacı notu:** "Neden üretilen PDF birincil değil?" — Üretilen PDF teknik olarak doğru ama tasarım olarak profesyonel CV kadar iyi değildi. 1.9.0'da profesyonel PDF birincil oldu; üretici silinmedi, yedek ve Web CV olarak duruyor. Public bağlantı aynı kaldı.

## Slayt 9 — Data Spine: Görsel Kimlik

- Sayfa boyu tek, sürekli bir veri omurgası
- Bölümler omurganın durakları; kartlar sırayla açılır
- Three.js + SVG + Anime.js; yerel sticky scroll
- Dekoratif katman: içerik semantik HTML
- Reduced motion: sabitleme yok, tüm içerik görünür

**Görsel:** SS-01 ve SS-02 yan yana; köşede küçük mobil görünüm (SS-13).
**Ekran görüntüsü:** Evet — SS-01, SS-02, SS-13.
**Konuşmacı notu:** Animasyonun içeriğin yerine geçmediğini vurgula: canvas `aria-hidden`, linkler HTML. Performans: yalnız açılış sayfasında yüklenir, sekme gizliyken durur.

## Slayt 10 — Cloudflare R2 Medya Sistemi

- Presign → imzalı PUT → finalize → doğrulama → kayıt
- JPEG/PNG/WebP · SVG/GIF red · en fazla 5 MB
- Magic-byte: dosyanın gerçek içeriği kontrol edilir
- Gerçek bucket ile uçtan uca test edildi
- Development'ta ISS kaynaklı TLS sorunu → yalnız dev aynı-origin uç nokta

**Görsel:** D-03 sequence diyagramı (sadeleştirilmiş) + SS-09 küçük resim.
**Ekran görüntüsü:** Evet — SS-09 (imza parametreleri ve hesap kimliği bulanık).
**Konuşmacı notu:** Dosya sunucudan geçmiyor ama sunucu her adımı denetliyor. Türk Telekom sorununu 15 saniyede anlat: kök neden kanıtlandı, çözüm yalnız development'ta, production değişmedi.

## Slayt 11 — Güvenlik Mimarisi

- Kayıt kapalı · rol yükseltme engelli · hız sınırı 5/dk giriş
- Origin + SameSite cookie ile CSRF savunması
- Zod allowlist · parametreli sorgu · Tiptap allowlist
- CSP, güvenlik başlıkları, `no-store`
- Secret'lar yalnız sunucuda; production audit 0

**Görsel:** D-04 katmanlı istek diyagramı (her katmanda hangi saldırının durduğu yazılı).
**Ekran görüntüsü:** Hayır.
**Konuşmacı notu:** Liste okumak yerine diyagramı takip et. Bitirirken: "Bunlar riski azaltır; sistem hacklenemez demiyorum, biçimsel penetrasyon testi yapılmadı."

## Slayt 12 — Kritik Güvenlik Bulgusu: Admin RSC Sızıntısı

- Yetkilendirme yalnız layout'taydı
- Yanıt 307 yönlendiriyordu, ama gövde özel veriyi taşıyordu
- 15 sayfadan 12'sinde taslak/gizli veri sızıyordu
- Çözüm: her sayfada veri öncesi `await requireAdmin()`
- Gövdeyi kontrol eden regresyon testi

**Görsel:** D-05 önce/sonra diyagramı. Altta 2 satırlık kod örneği.
**Ekran görüntüsü:** İsteğe bağlı — SS-16.
**Konuşmacı notu:** Sunumun en önemli slaytı; acele etme. Hiç deploy edilmediği için canlı maruziyet yok. Ders: yalnız durum kodunu test etmek yetmez; yanıtın içeriğini test etmek gerekir.

## Slayt 13 — Test Sonuçları

- Unit 131/131 · Security unit 11/11
- Security HTTP 8/8 · Tam HTTP 140/140
- Yüklenen CV HTTP 16/16 (yerel S3 mock)
- Lint, typecheck, production build: başarılı
- `npm audit --omit=dev`: 0 · tam audit: yalnız dev-only lint zinciri
- Testler gerçek veritabanına dokunmaz

**Görsel:** Sade sonuç tablosu; yanında küçük "test sayısının sürümlere göre artışı" çizgi grafiği (63 → 131 unit).
**Ekran görüntüsü:** İsteğe bağlı — SS-15.
**Konuşmacı notu:** Rakamları okumak yerine bir örnek ver: sızıntı testinin, açık varken gerçekten başarısız olduğu doğrulandı. Dev-only audit uyarısının neden zorla düzeltilmediğini tek cümleyle söyle.

## Slayt 14 — Sonuç ve Sonraki Adımlar

- Yerelde tamamlandı ve doğrulandı
- Bekleyen: production deploy, custom domain, canlı HTTPS cookie testi
- Sonraki: 2FA, Lighthouse, ekran okuyucu ve cihaz testi
- Şimdi kısa canlı demo

**Görsel:** İki sütun: "Tamamlandı" / "Deployment ile doğrulanacak". Arka planda mobil görünüm (SS-13).
**Ekran görüntüsü:** İsteğe bağlı — SS-13.
**Konuşmacı notu:** Sınırları açıkça söyle; bu güven verir. Teşekkür et ve demoya geç.

---

## Yedek slaytlar (sorulara göre)

- **Y1 — ER diyagramı** (D-02)
- **Y2 — Komut paleti ve terminal** (SS-14): gerçek kabuk değil, sabit komut listesi
- **Y3 — Türk Telekom TLS incelemesi ayrıntısı:** elenen nedenler listesi (uygulama, R2, CORS, CSP)
- **Y4 — Bağımlılık bakımı 1.8.2 → 1.8.3:** Next.js 16.3.6 → 16.3.8, sharp 0.35.4 → 0.35.5, source-map-js 1.2.1 → 1.2.2
