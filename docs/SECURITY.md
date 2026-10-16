# Güvenlik Kaydı

## 1.9.0 — Yüklenen profesyonel CV PDF (2026-10-15)

| Tehdit | Kontrol | Konum | Kanıt |
| --- | --- | --- | --- |
| Anonim / farklı origin'den CV yükleme, değiştirme, kaldırma | Her route `requireAdminApi` (oturum + `admin` rolü + aynı origin) | `/api/admin/cv/pdf`, `/presign`, `/finalize` | HTTP: anonim 401; oturumlu ama `Origin: https://evil.example` 401 |
| PDF dışı dosya (HTML/SVG/görsel `.pdf` adıyla, sahte `application/pdf`) | Presign: Zod `mimeType = application/pdf`, ad `.pdf`, `0 < size ≤ 5 MB`. Finalize: R2 `HEAD` gerçek MIME + boyut + biletteki beklenen boyut; Range GET ilk baytlar `%PDF-`. Uyuşmazlıkta nesne silinir. İstemci kontrolü yalnız UX. | `src/features/cv/uploaded-pdf.ts`, `finalize/route.ts` | Unit (imza/şema) + HTTP mock: HTML, SVG, PNG, yanlış MIME, boyut uyuşmazlığı → 400 ve nesne silinmiş |
| Bilet sahteciliği / görsel biletiyle karışma | Ayrı CV bilet şeması (`scope: "cv"`, `cv/<uuid>.pdf`, `application/pdf`, beklenen boyut, ad, son kullanma) ve alan-ayrımlı HMAC girdisi `cv-upload:`; görsel bileti formatı değişmedi | `src/server/storage/upload-token.ts` | HTTP: sahte/bozuk bilet 400; CV bileti proje finalize'ında 400 |
| Rastgele R2 nesnesinin public CV üzerinden okunması | Public uç nokta istekten yalnız `download` okur; aktif anahtar DB'den gelir ve `^cv/<uuid>\.pdf$` şemasından geçmeyen anahtar yok sayılır. Görsel proxy'si (`/api/media/r2`) CV anahtarlarını reddeder. | `/api/cv/pdf`, `getActiveUploadedCv` | HTTP: `?key=…`, `?url=…` yok sayılır; proxy CV nesnesi için 200 dönmez |
| Başarısız yükleme aktif CV'yi bozar | Değiştirilemez UUID anahtarları; DB geçişi doğrulamadan sonra tek işlemde; eski nesne geçişten sonra best-effort silinir | `activateUploadedCv`, finalize | HTTP mock: reddedilen yüklemelerden sonra aktif CV aynı bayt |
| Depolama kesintisi CV bağlantısını kırar | R2 okuma/doğrulama hatasında üretilen PDF'e düşülür, hata türü dışında ayrıntı loglanmaz | `/api/cv/pdf` | HTTP mock: storage 500 → `X-CV-Source: generated` |
| Eski CV'nin önbellekte kalması / MIME sniffing | `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, sabit `Content-Type: application/pdf` | `/api/cv/pdf` | HTTP: tüm modlarda başlıklar doğrulandı |
| `Content-Disposition` header injection / depolama ayrıntısı sızıntısı | Dosya adı profil adından `toSlug()` + `[a-z0-9.-]` filtresi; UUID/anahtar dosya adına girmez. Admin UI anahtar göstermez. | `cvContentDisposition`, `cvDownloadFileName` | Unit: CR/LF ve tırnak temizlenir; HTTP: dosya adında UUID yok, admin HTML'de anahtar yok |
| Secret sızıntısı | R2 secret, auth secret, admin parolası admin HTML/RSC, API JSON ve public HTML'de yok. Not: S3 presigned URL `X-Amz-Credential` içinde Access Key **ID**'yi taşır (tasarım gereği, yalnız admin'e döner, secret değildir; görsel yüklemeyle aynı). | — | HTTP mock: secret değer taraması |
| Test seam'in kötüye kullanımı | `R2_TEST_ENDPOINT` production'da yok sayılır; yalnız `http://127.0.0.1:<port>/` veya `http://localhost:<port>/`; kimlik/query/path içermeyen origin | `src/features/media/r2-test-endpoint.ts` | Security unit |

**Kalan risk / sınırlama.** Otomatik HTTP testleri imza doğrulamayan yerel S3 mock'u kullanır; gerçek R2'nin imza, süre ve `Content-Type` imzası davranışı `tests/phase8-r2-smoke.mjs` ile ayrıca kapsanır. Presigned PUT içerik uzunluğunu imzalamaz (1.8.2 değerlendirmesi), sınır finalize'da kesinleşir; finalize edilmemiş `cv/` nesneleri için production'da bucket lifecycle kuralı önerilir. Yüklenen PDF'in **içeriği** (ör. gömülü JavaScript) taranmaz; dosya yalnız yöneticinin kendi yüklediği belgedir ve tarayıcının PDF görüntüleyicisinde, `nosniff` ile sunulur.

## 1.8.3 — Bağımlılık güvenliği ve gerçek R2 doğrulaması (2026-10-10)

**Bağımlılıklar.** Next.js 16.3.6 → 16.3.8, sharp 0.35.4 → 0.35.5, source-map-js 1.2.1 → 1.2.2. `npm audit --omit=dev` 0 bulgu verir. Tam `npm audit` yalnız lint araç zincirindeki dev-only `braces` uyarısını raporlar (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`). Bu paketler production bundle'a veya sunucu çalışma zamanına girmez. İnceleme anında uyumlu upstream düzeltme yoktu; `npm audit fix --force` `eslint-config-next`'i 14.x'e düşüreceği için bilinçli olarak uygulanmadı.

**Gerçek R2.** Bucket yapılandırıldı ve akış uçtan uca denendi: admin → presign API → imzalı R2 PUT → finalize → HEAD (MIME/boyut) + Range GET (magic byte) → DB/public URL → public render. JPEG/PNG/WebP kabul, SVG/GIF ve 5 MB üstü red, anonim presign 401. R2 credential'ları yalnız server-side okunur.

**Development medya uç noktası.** Türk Telekom ağında `*.r2.dev` TLS bağlantılarına bir ara cihazın müdahale ettiği kanıtlandı. `GET /api/media/r2` yalnız `NODE_ENV=development` iken çalışır, aksi hâlde 404 döner. Açık proxy değildir: kaynak URL'nin origin'i yapılandırılmış `R2_PUBLIC_BASE_URL` ile birebir eşleşmeli, query/fragment içermemeli ve anahtar `projects|blog/<uuid>/<uuid>.(jpg|png|webp)` biçiminde olmalıdır. Nesne server-side R2 istemcisiyle okunur, `Content-Type` JPEG/PNG/WebP allowlist'inde değilse 415 döner; yanıt `no-store` ve `nosniff` taşır. Production CSP, HSTS ve medya teslimi değiştirilmedi.

**Kalan risk.** 1.8.2 kaydındaki "presigned PUT içerik uzunluğunu imzalamaz" değerlendirmesi geçerlidir; boyut sınırı finalize adımında kesinleşir. Production'da finalize edilmemiş nesneler için bucket lifecycle kuralı önerilir.

## 1.8.2 — Admin RSC/page-segment authorization hardening (2026-10-02)

**Bulgu (CRITICAL, düzeltildi).** Admin sayfalarında yetkilendirme yalnız `src/app/admin/(protected)/layout.tsx` içindeki `requireAdmin()` çağrısındaydı. Next.js App Router'da layout, alt sayfa segmentinin render edilmesini durdurmaz; sayfa segmenti layout ile paralel çalışır ve çıktısı RSC payload'ına girebilir. Kimliği doğrulanmamış bir istek `307 → /admin/login` alıyordu, ancak aynı yanıtın HTML gövdesi (ve `RSC: 1` isteğinde 200 dönen Flight payload'ı) sayfanın çektiği özel veriyi içeriyordu. Disposable veritabanında benzersiz canary kayıtlarla 15 admin sayfasından 12'sinde sızıntı yeniden üretildi: taslak yazı başlığı/özeti, gizli telefon/e-posta/konum, gizli sosyal bağlantı, gizli sertifika ve credential ID, gizli eğitim/deneyim/yetenek ve private repository URL'si. Mutasyon API'leri etkilenmedi; yalnız okuma sızıntısıydı. Uygulama hiç public deploy edilmediğinden canlı maruziyet yoktur.

**Düzeltme.** `(protected)` altındaki 15 sayfanın tamamı, herhangi bir repository/DB çağrısından önce ilk satırda `await requireAdmin()` çağırır. Layout kontrolü kullanıcı arayüzü için korunur; yetkilendirme artık veri kaynağına en yakın noktada yapılır (Next.js auth kılavuzundaki "Layouts and auth checks" uyarısı). Yeni admin sayfası ekleyen geliştirici aynı kalıbı izlemelidir; layout korumasına güvenilmemelidir.

**Regresyon.** `tests/phase5-http.mjs`, benzersiz başlıklı bir taslak yazı oluşturur ve anonim HTML ile RSC yanıt **gövdelerinde** bu başlığın bulunmadığını doğrular; yalnız durum kodu yeterli sayılmaz. Test, guard'lar geçici olarak kaldırıldığında başarısız olduğu doğrulandıktan sonra eklendi ve kayıt `finally` içinde silinir.

**İlgili sertleştirmeler.**
- Admin JSON gövdeleri `readJsonWithLimit` ile 1 MiB'te sınırlandı (`Content-Length` ön kontrolü ve akış sırasında sayım). En büyük meşru gövde 200 000 karakterlik Tiptap içeriği olduğundan çok baytlı Türkçe metin dahil sığar. Bu okuma her rotada yetkilendirmeden sonra yapılır; anonim istekler gövdeyi hiç tamponlamaz.
- `.gitignore` açıkça `.local-backups/`, `*.sqlite*`, `*.db-journal` ve `.claude/settings.local.json` dışlar.

**Değerlendirilen ve kabul edilen düşük riskler.**
- *Origin/Sec-Fetch-Site ikisi de yok:* `isTrustedMutationRequest` bu durumda CLI/test istemcileri için isteği kabul eder. Tarayıcıdan gelen bir CSRF bu yolu kullanamaz: güncel tarayıcılar GET/HEAD dışındaki her cross-origin `fetch`/form isteğinde `Origin` gönderir; ayrıca session cookie'si `SameSite=Lax` olduğundan cross-site POST/PUT/PATCH/DELETE alt isteklerine eklenmez. Header'sız istek göndermek için cookie'ye zaten sahip olmak gerekir. Fail-open sayılmadı, değiştirilmedi.
- *Presigned PUT içerik uzunluğunu imzalamaz:* URL yalnız admin oturumuyla, 5 dakika geçerli ve sunucunun ürettiği tek bir anahtar için verilir. Finalize adımı `HeadObject` boyutu, MIME tipi, token'daki beklenen boyut ve magic byte'ları doğrular; uyuşmazlıkta nesneyi siler ve DB kaydı oluşturmaz. Kalan risk, sızmış bir URL ile finalize edilmemiş büyük bir nesnenin bucket'ta kalmasıdır (maliyet, veri ifşası değil). Gerçek R2 ile test edilemediğinden imzalı `Content-Length` eklenmedi; production'da bucket lifecycle kuralı ile finalize edilmemiş nesnelerin temizlenmesi önerilir.
- *Upload token `BETTER_AUTH_SECRET` ile imzalanır:* HMAC-SHA256, `timingSafeEqual` ile doğrulanır; payload `scope`, `resourceId`, `key`, `mimeType`, `expectedSize` ve `expiresAt` alanlarıyla alan ayrımı sağlar. Anahtar yeniden kullanımı bilinen bir saldırı yolu açmaz; secret sızarsa oturumlar zaten tehlikededir. Akademik tek admin kapsamında ayrı anahtar gereksiz karmaşıklık olarak değerlendirildi.

## 1.8.1 R2 yapılandırılmamış ortam

Presign rotaları yönetici kimliği, isteğin origin'i, giriş ve kayıt varlığını doğruladıktan sonra eksik R2 ayarında 503 ve genel bir kullanıcı mesajı döndürür. Secret değeri yanıta veya istemciye gönderilmez. Tam yetkilendirme/gizlilik HTTP regresyonu geçti. (Tarihsel not: gerçek R2 doğrulaması 1.8.3'te yapıldı.)


## 1.8.0 Phase 18 — Sertifika sınırları (2026-09-30)

Sertifika mutasyonları yönetici API rotalarından geçer; giriş şeması başlık, uzunluk, ISO tarih ve bitiş tarihi sırasını doğrular. Doğrulama adresi yalnız güvenli HTTPS dış bağlantısı olabilir; `http:`, `javascript:`, `data:` ve kimlik bilgisi taşıyan URL'ler reddedilir. Saklı bağlantı public DTO'ya alınırken tekrar denetlenir. Public sorgular gizli sertifikaları, CV sorgusu ayrıca `showInCv` kapalı sertifikaları SQL düzeyinde dışlar. Çıkış DTO'su admin görünürlük bayraklarını ve zaman damgalarını içermez. Phase 18 güvenlik testlerinin nihai sonucu [TEST_LOG](TEST_LOG.md) içinde kaydedilir.

## 1.2.0 — Narrative UI sınırı

Bu phase server repository/schema/auth/CV filtrelerini değiştirmedi. Browser scene store yalnız chapter/progress/transform bilgisi içerir, credential veya private DTO taşımaz. Utsubo/model/texture/CDN bağımlılığı eklenmedi; CSP gevşetilmedi. Terminal eval/href allowlist ve draft/private repo/phone/social/CV sınırları mevcut testlerle tekrar doğrulanır. Ayrı security unit 6/6; HTTP nihai sonuçları TEST_LOG'dadır.

## 1.1.0 — Korunan UX/CV özellikleri ve önceki hareket mimarisi (2026-09-26)

`shortBio` yalnız landing Hero'da; `longBio` Hakkımda'da kullanılır. CV özeti override → longBio → bölüm yok sırasını izler. Eğitim programı opsiyoneldir; boş/dash-only içerik render edilmez, eski kayıt değiştirilmez. Timeline yalnız eğitim ve deneyimdir; projeler showcase içinde kalır.

Profile `phone` / `isPhoneVisible` ve Social Links `showInCv` additive migration ile eklendi. Telefon güvenli `tel:` normalizasyonu ve görünürlük filtresiyle Contact/web CV/PDF'e ulaşır. CV ve CV shell yalnız `isVisible && showInCv` linklerini alır. GitHub/LinkedIn/Website CV varsayılanı true, diğerleri false; admin değiştirebilir. Instagram, Behance, Dribbble dahil platformlar desteklenir.

PDF artık yerel OFL lisanslı Noto Sans Regular/Bold TTF kullanır; Helvetica kararı bu sürümde geçersiz kılınmıştır. Tek kolon/selectable metin korunur. Terminal header yardımcı kontrolüne taşındı; footer bio/admin/version tekrarlarından arındırıldı. Landing arka planı fixed üç katman, rAF/CSS variables ve section IntersectionObserver kullanır; reduced-motion statiktir. Mevcut Three/Anime sistemleri korunur. FPS/ATS-vendor kabulü iddiası yoktur.

Güncel doğrulama ve sınırlamalar: [UX phase raporu](UX_PHASE_REPORT.md). Önceki phase test sayıları ve kararları tarihsel kayıttır.


Son güncelleme: 24 Eylül 2026

## Uygulanan Önlemler

| Tehdit | Önlem | Uygulama | Test |
| --- | --- | --- | --- |
| Database credential sızıntısı | Turso değerleri yalnızca server environment'tan okunur; `NEXT_PUBLIC_` kullanılmaz | `src/server/env-core.ts`, `src/db/index.ts` | Gerçek test URL/secret değeri client chunk'larında aranmış, eşleşme bulunmamıştır |
| Auth secret zayıflığı/sızıntısı | Secret en az 32 karakter olmalı; source ve migration'a yazılmaz | `src/server/env-core.ts`, `.env.example` | Kısa/eksik değer runtime'da hata üretir; client bundle'da test secret değeri yoktur |
| Public hesap oluşturma | Email/password signup kapalıdır | `emailAndPassword.disableSignUp: true` | `/api/auth/sign-up/email` HTTP 400 ve `EMAIL_PASSWORD_SIGN_UP_DISABLED` döndürdü; user sayısı değişmedi |
| Admin route bypass | Session ve `admin` rolü her `/admin` isteğinde sunucuda doğrulanır | `src/server/require-admin.ts`, `src/app/admin/page.tsx` | Oturumsuz istek HTTP 307 ile `/admin/login`'e gitti; admin session HTTP 200 aldı |
| Yetkisiz admin işlemi | Tekrar kullanılabilir `requireAdmin()` sınırı oluşturuldu | `src/server/require-admin.ts` | Protected page testi başarılı; gelecek Server Action/API'ler helper'ı çağırmalıdır |
| Parola ifşası | İlk admin yalnızca etkileşimli CLI ile oluşturulur; parola gizli prompt'ta alınır | `npm run auth:bootstrap`, `src/server/auth.cli.ts` | Geçici local DB'de admin oluşturma ve gerçek login başarılı; test DB silindi |
| Parola saklama | Better Auth credential account ve varsayılan scrypt hashing kullanılır | Better Auth email/password | CLI admin ile login doğrulandı; plaintext parola migration/source içinde yoktur |
| Login enumeration | Arayüz, 401 detayından bağımsız tek genel hata mesajı gösterir | `src/components/admin/login-form.tsx` | Kod incelemesi; client yalnızca genel mesaj veya 429 bekleme mesajı gösterir |
| Brute force | Database tabanlı rate limit; email login 5 istek/60 saniye | `src/server/auth-core.ts`, `rate_limits` | Geçici DB testinde yanıtlar `401,401,401,401,429,429` oldu |
| CSRF ve kötü origin | Better Auth origin/CSRF kontrolleri korunur; custom admin mutation ayrıca exact-origin/Fetch Metadata guard kullanır | `src/server/auth-core.ts`, `src/server/require-admin.ts` | Same-origin login başarılı; authenticated cross-origin mutation HTTP 401 |
| Güvensiz production origin | Production `BETTER_AUTH_URL` HTTPS değilse uygulama auth runtime'ı hata verir | `src/server/env-core.ts` | TypeScript/build doğrulaması; local HTTP yalnız development testinde kullanıldı |
| Session ele geçirme süresinin uzaması | Database session 7 gün, refresh aralığı 1 gün | `src/server/auth-core.ts` | Auth config ve üretilen `sessions` tablosu incelendi |
| Cookie güvenliği | Better Auth'ın `httpOnly`, `sameSite=lax` ve production'da `secure` varsayımları değiştirilmedi | Better Auth 1.7.5 config | Local response'ta HttpOnly/SameSite=Lax/Path/expiry doğrulandı; Secure için production HTTPS bekliyor |
| MIME sniffing | `X-Content-Type-Options: nosniff` | `next.config.ts` | Phase 0 production header testi başarılı |
| Clickjacking | `X-Frame-Options: DENY` | `next.config.ts` | Phase 0 production header testi başarılı |
| Local DB'nin production'da kullanılması | `file:` URL production runtime'da reddedilir; uzak DB token ister | `src/server/env-core.ts` | Environment doğrulama kodu ve local development migration testi |
| Project mutation bypass | Her JSON mutasyonu session + admin rolünü tekrar doğrular | `requireAdminApi`, `/api/admin/projects/**` | Oturumsuz create/update/delete/presign HTTP 401 |
| Mass assignment | Zod whitelist sonucu elle seçilmiş DB alanlarına dönüştürülür | `validation.ts`, `repository.ts` | Geçersiz enum/slug/URL senaryoları |
| Geçersiz skill ilişkisi | UUID formatı ve database varlığı doğrulanır | `validateSkillIds` | Olmayan skill ID HTTP 400 |
| Draft sızıntısı | Public sorgularda `published = true` zorunludur | public repository sorguları | Draft liste dışı ve detay 404 |
| Private repository sızıntısı | URL yalnız `public` görünürlükte public SQL projeksiyonuna girer | `getPublicProject` | Private etiketi var, özel URL HTML'de yok |
| R2 credential sızıntısı | SDK/env `server-only`; credential'larda public prefix yok | `src/server/storage`, `.env.example` | Kod/build sınırı; 1.8.3 gerçek bucket testinde secret client'a ulaşmadı |
| Presigned URL kötüye kullanımı | Admin-only, 300 saniye, tek key/PUT ve imzalı Content-Type | presign route, `r2.ts` | Anonymous presign 401 |
| Zararlı/istenmeyen format | JPEG/PNG/WebP MIME allowlist; SVG/GIF reddedilir | validation | Unit + HTTP SVG testi 400 |
| Aşırı büyük object | Finalize HEAD'de positive/exact/≤5 MB kontrolü | finalize route | Unit/HTTP metadata testi; 1.8.3'te gerçek R2 ile 5 MB üstü red doğrulandı |
| Arbitrary object finalize | HMAC bilet project/key/MIME/size/expiry bağlar | `upload-token.ts` | Sahte finalize bileti HTTP 400 |
| Object key traversal/çakışma | Kullanıcı filename'i yok; project UUID + random UUID | presign route | Kod incelemesi |
| Yıkıcı project silme | UI confirmation; admin kontrolü; R2/media körlemesine silinmez | admin/API/repository | Delete 204, public detay 404 |
| Blog rich-text XSS (arbitrary HTML/script) | İçerik yalnızca izin verilen Tiptap düğüm/mark allowlist'iyle normalize edilir; sunucu tarafı yazma yolunda reddedilir; public render `dangerouslySetInnerHTML` kullanmaz | `src/features/blog/content-schema.ts`, `src/features/blog/render-content.tsx` | Unit: desteklenmeyen düğüm/`<script>` reddi; HTTP: malformed/unsupported JSON 400, script payload public HTML'de literal olarak yok |
| Tehlikeli link protokolü (`javascript:`, `data:`, `vbscript:`) | Link mark'ı yalnızca `http:`/`https:`/`mailto:` protokolüyle kabul edilir; harici linklerde `rel="noopener noreferrer nofollow"` ve `target="_blank"` sunucu tarafında sabitlenir | `content-schema.ts` `isSafeHref` | Unit + HTTP: `javascript:`/`data:`/`vbscript:` reddi |
| Blog mutation bypass | Her JSON mutasyonu (`create/update/delete/state/cover`) session + admin rolünü tekrar doğrular | `requireAdminApi`, `/api/admin/posts/**`, `/api/admin/categories/**` | Oturumsuz create/update/delete/presign HTTP 401 |
| Blog mass assignment | Zod whitelist sonucu elle seçilmiş DB alanlarına dönüştürülür (`postValues`) | `src/features/blog/validation.ts`, `src/server/blog/repository.ts` | Geçersiz slug/kategori/etiket/içerik senaryoları HTTP 400 |
| Geçersiz kategori/etiket ilişkisi | Kategori/etiket ID'leri veritabanında var olma açısından doğrulanır; yeni etiketler yalnızca slug normalize edilerek find-or-create ile oluşur | `validateCategoryId`, `validateTagIds`, `resolveNewTagIds` | Olmayan kategori/etiket ID HTTP 400 |
| Blog draft sızıntısı | Public sorgularda `status = 'published'` zorunludur; draft detay 404 döner | `listPublicPosts`, `getPublicPost` | Draft liste dışı, detay HTTP 404; publish sonrası görünür |
| Blog cover upload istismarı | Project cover ile aynı imzalı tek-object akışı `blog/{postId}/{uuid}.{ext}` namespace'inde ve ortak `upload-token.ts` scope alanıyla (`projects`/`blog`) yeniden kullanılır | presign/finalize route'ları, `upload-token.ts` | SVG/oversize/arbitrary finalize token HTTP 400; anonymous presign 401 |
| Aşırı büyük içerik payload'ı | Başlık/özet/SEO alanlarında karakter sınırı; Tiptap JSON'da düğüm sayısı, metin uzunluğu ve serileştirilmiş boyut (200.000 karakter) sınırı | `content-schema.ts`, `validation.ts` | Unit testler |
| CV profil mutation bypass | `PUT /api/admin/profile` her istekte session + admin rolünü tekrar doğrular | `requireAdminApi`, `/api/admin/profile` | Oturumsuz PUT HTTP 401 |
| Education/Experience/Skill/CV settings mutation bypass | Her mutation route'u ayrı ayrı `requireAdminApi` çağırır; layout korumasına güvenilmez | `/api/admin/education/**`, `/api/admin/experience/**`, `/api/admin/skills/**`, `/api/admin/cv/settings` | Oturumsuz create/update/delete/PUT hepsi HTTP 401 (`tests/phase4-http.mjs`) |
| CV mass assignment | Zod whitelist sonucu elle seçilmiş DB alanlarına dönüştürülür (`upsertProfile`, `createEducation`, `createSkill`, `upsertCvSettings` vb.) | `src/features/cv/validation.ts`, `src/server/cv/repository.ts` | Geçersiz email/tarih/slug/section-order senaryoları HTTP 400 |
| Tutarsız eğitim/deneyim tarihleri | `isCurrent=true` iken `endDate` reddedilir; `endDate < startDate` reddedilir (Zod `superRefine`, sunucu tarafında) | `educationInputSchema`, `experienceInputSchema` | Unit + HTTP: her iki ihlal senaryosu 400 |
| Geçersiz kategori/section-order girdisi | `cv_settings.sectionOrder`/`sectionVisibility` yalnız sabit `cvSectionIds` kümesini kabul eder; bilinmeyen bir bölüm adı reddedilir | `cvSettingsInputSchema` | Bilinmeyen section id HTTP 400 |
| Public CV'de gizli e-posta/konum sızıntısı | `isEmailVisible`/`isLocationVisible` false ise alan `getPublicCvData()` DTO'sunda hiç üretilmez (yalnız CSS ile gizleme değil) | `src/server/cv/repository.ts` `getPublicCvData` | HTTP: gizli e-posta/konum ne `/cv` HTML'inde ne PDF metninde bulunuyor |
| Yayınlanmamış/CV-dışı proje sızıntısı | CV projeleri `published = true AND include_in_cv = true` filtresinden geçer (mevcut public proje sorgusu yeniden kullanılır) | `listPublicProjects({ includeInCv })` | HTTP: yayınlanmamış proje `/cv`'de yok |
| Gizli yetenek sızıntısı | Yalnız `isVisible = true` yetenekler DTO'ya girer | `getPublicCvData` | HTTP: gizli yetenek `/cv` ve PDF'de yok |
| Skill silme yan etkisi | `project_skills.skill_id` `onDelete: cascade`; admin UI silmeden önce "bu, yeteneği tüm projelerden kaldırır" uyarısı gösterir | `skill-manager.tsx`, schema | Kod incelemesi + confirm dialog metni |
| PDF response header injection | (1.9.0: `inline` varsayılan, `?download=1` → `attachment`; aynı ad kuralı) `Content-Disposition` dosya adı yalnızca `toSlug()`'dan gelir (`[a-z0-9-]` dışında karakter üretemez); CR/LF veya özel karakter yapısal olarak imkânsızdır | `/api/cv/pdf` | HTTP: header regex doğrulaması (`filename="[a-z0-9-]+\.pdf"`) |
| PDF'te remote/arbitrary içerik | Şablon yalnız DB'den gelen metni render eder; harici görsel fetch, script veya aktif içerik yoktur; avatar/fotoğraf ana ATS şablonuna dahil edilmez | `src/server/cv/pdf-document.tsx` | Kod incelemesi |
| ATS checker girdi güveni | Kurallar yalnız zaten doğrulanmış/gizlilik-filtreli `PublicCvData` üzerinde çalışır; hiçbir ham client input'u doğrudan işlemez, ağ/AI çağrısı yapmaz | `src/features/cv/ats-rules.ts` | Unit: deterministic skor testi (aynı girdi → aynı skor) |

## Public CV Privacy Boundary

CV'nin gizlilik sınırı, response oluşturulmadan ÖNCE, sunucu tarafında
`getPublicCvData()` içinde uygulanır:

```text
profiles.email, profiles.location, profiles.phone  (ham DB satırı — server-only)
  ↓ getPublicCvData()
  ↓  isEmailVisible ? email : null
  ↓  isLocationVisible ? location : null
  ↓  isPhoneVisible && normalizePhone(phone) ? phone : null
  ↓  socialLinks: isVisible AND showInCv; HTTPS allowlist
PublicCvData  (gizli alanlar null, CV dışı linkler listede yok)
  ├── /cv (HTML)
  ├── /api/cv/pdf (PDF bytes)
  └── ATS checker (skor hesaplama)
```

Gizli alanlar hiçbir zaman client'a, PDF byte'larına veya React prop'larına
ulaşmaz — "sadece CSS ile gizleme" yapılmaz. Aynı prensip yayınlanmamış/CV-dışı
projeler ve gizli yetenekler için de geçerlidir: filtre SQL sorgusunun
`WHERE` koşulunda uygulanır, sonradan client-side filtrelenmez.

## Güvenlik Sınırı

```text
Browser
  ↓ same-origin auth request / session cookie
Next.js server
  ↓ requireAdmin (session + role)
Drizzle server client
  ↓ server-only Turso credentials
Turso / libSQL
```

Browser'a database URL/token veya Better Auth secret verilmez. Public arayüzün
doğrudan database bağlantısı yoktur. Auth API route'u runtime'da server auth
modülünü dinamik import eder; build sırasında credential gerektirmez.

R2 upload sınırı `admin → presign → doğrudan R2 PUT → finalize → HEAD → DB`
akışıdır. Presigned URL bearer token kabul edilir ve loglanmamalıdır. Browser
`file.size` kontrolü güvenlik sınırı değildir. PUT imzasında güvenilir bir azami
Content-Length garantisi bulunmadığından 5 MB kuralı finalize `HeadObject`
sonrasında kesinleşir. Uyuşmayan yeni key silinir ve database'e bağlanmaz.
Width/height browser decode sonucudur; yalnız layout metadata'sıdır.

## İlk Adminin Güvenli Oluşturulması

1. Production environment'ta dört gerekli değişkeni tanımlayın.
2. `npm run db:migrate` ile versioned migration'ı uygulayın.
3. Güvenilir bir terminalde şu komutu çalıştırın:

```bash
npm run auth:bootstrap -- --email admin@example.com --name "Admin" --role admin
```

CLI parolayı gizli olarak sorar. Parolayı komuta argüman, `.env.example`, source,
migration veya dokümana yazmayın. Public signup endpoint'i kapalı olduğundan
browser üzerinden ilk hesap oluşturulamaz. Production'da `--force` veya `--yes`
kullanılmaması, var olan kullanıcı uyarısının görülmesi önerilir.

## Environment Kuralları

- `.env.local` ve deployment secret store Git'e dahil edilmez.
- `BETTER_AUTH_SECRET` yüksek entropili ve en az 32 karakter olmalıdır.
- `BETTER_AUTH_URL` production'da gerçek HTTPS origin olmalıdır.
- Uzak Turso bağlantısında `TURSO_AUTH_TOKEN` zorunludur.
- Secret içeren hiçbir değişkende `NEXT_PUBLIC_` prefix'i kullanılmaz.
- R2 account/access/secret/bucket server-only'dir; public base URL secret değildir.
- Secret rotasyonu deployment prosedürü belirlenmeden eski değer silinmemelidir.

## Rich-Text Trust Boundary (Blog)

Blog içeriği admin tarafından girilse dahi untrusted input olarak ele alınır:
admin hesabının ele geçirilmesi veya hatalı/otomatik bir istemcinin arbitrary
JSON göndermesi ihtimaline karşı sunucu, istemciden gelen JSON'u asla olduğu
gibi güvenmez. `postContentSchema` (`src/features/blog/content-schema.ts`)
her düğümü ve mark'ı elle gezip yalnız allowlist'teki türleri kabul eder:

- Düğümler: `doc`, `paragraph`, `heading` (yalnız level 2/3), `bulletList`,
  `orderedList`, `listItem`, `blockquote`, `codeBlock` (yalnız düz metin
  içerebilir), `horizontalRule`, `hardBreak`, `text`.
- Mark'lar: `bold`, `italic`, `strike`, `code`, `link` (yalnız
  `http:`/`https:`/`mailto:` protokolü; harici link `rel`/`target` sunucu
  tarafında sabitlenir).

Bu allowlist dışında kalan her şey (`image`, `iframe`, `html`, `script`,
bilinmeyen düğüm/mark türü, güvensiz link protokolü) `PostContentError`
fırlatır ve `postInputSchema.safeParse` sonucu `success: false` olur; istek
HTTP 400 ile reddedilir ve veritabanına hiçbir zaman yazılmaz. Public
render katmanı (`src/features/blog/render-content.tsx`) bu normalize
edilmiş yapıyı `dangerouslySetInnerHTML` kullanmadan, düğüm türü başına
sabit bir React elemanına (`<p>`, `<h2>`, `<pre><code>` vb.) eşler; render
sırasında yapı tekrar normalize edilir (defense in depth). Bu iki katman
sayesinde raw/arbitrary HTML hiçbir zaman veritabanına yazılamaz ve
yazılsa dahi render edilemez — JSON → controlled server renderer yaklaşımı
XSS'i formal olarak önler; ek bir HTML sanitizer kütüphanesi (örn.
DOMPurify) gerekli değildir ve eklenmemiştir (bkz. DECISIONS.md).

## Phase 5 Production Security Specification

### Response Policy

- Production CSP: `default-src 'self'`; script ve style self + framework için
  gerekli `unsafe-inline`; image self/data/blob + yalnız yapılandırılmış HTTPS R2
  origin; font/connect self; object/frame kapalı; base/form self;
  `frame-ancestors 'none'`; `upgrade-insecure-requests`.
- `unsafe-eval` production'da yoktur; yalnız development React/HMR için eklenir.
  `*` source kullanılmaz. Nonce, tüm App Router sayfalarını dynamic yapıp static
  optimization/PPR/CDN cache'i kaldıracağı için seçilmemiştir.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` ve camera/microphone/
  geolocation kapatan Permissions Policy bütün response'larda uygulanır.
- HSTS yalnız production build'de `max-age=31536000` ile uygulanır. Domain
  envanteri kesinleşmediği için `includeSubDomains` ve geri dönüşü zor preload
  kullanılmaz. Local development'ta HSTS/upgrade yoktur.
- Admin ve auth response'ları production'da `Cache-Control: no-store` alır. PDF
  başarı, 404 ve 500 yanıtları `no-store` döner. Public gizlilik filtresi cache
  oluşturulmadan önce repository/DTO katmanında gerçekleşir.

### Auth, Origin ve Proxy

Better Auth email/password signup kapalı; parola 12–128 karakter; database
session yedi gün, update age bir gün; login rate-limit database'de 5 istek/60
saniyedir. Auth endpoint'lerinde Better Auth origin/CSRF kontrolü korunur.
Custom `/api/admin/**` mutation'ları ayrıca `Origin === BETTER_AUTH_URL` ister;
Origin yoksa browser Fetch Metadata `cross-site` değerini reddeder. Header'sız
CLI/server-to-server test istemcileri session/role kontrolüne geçebilir.

Rate limit için Better Auth'ın mevcut IP çözümü değiştirilmemiştir. Vercel'in
gerçek proxy zinciri doğrulanmadan application kodu rastgele `x-forwarded-for`
değerine güvenmez. Tek admin CMS'de R2 presign/finalize auth+origin+5 dakika
token ile sınırlandığından ikinci bir process-local limiter eklenmemiştir; bu tür
limiter serverless instance'lar arasında yanlış güvence verirdi. Public PDF
remote fetch yapmaz, küçük CV verisini işler ve `no-store` ile güncel üretilir;
mevcut ölçekte ayrıca distributed limiter gerektirmemiştir.

### Upload ve Cloud Storage

R2 finalize şu sırayı zorunlu tutar: HMAC scope/resource/key/MIME/size/expiry,
HEAD exact MIME + positive/exact/≤5 MB size, `bytes=0-15` Range GET ve JPEG/PNG/
WebP signature. Uyuşmaz object silinir. Kullanıcı filename/path vermez; UUID
namespace traversal ve çakışmayı önler. Bu Range GET her finalize için küçük ek
read/latency maliyeti getirir, fakat bütün object'i Next.js üzerinden taşımadan
MIME spoofing'i azaltır. CORS ve custom-domain adımları `DEPLOYMENT.md` içindedir.
Otomatik orphan cleanup eklenmemiştir; manuel inventory yolu belgelenmiştir.

### Error, Log ve Secret Isolation

Validation hataları yalnız alan bazlı güvenli Zod detaylarını; unknown hatalar
generic 500 mesajını döndürür. Project/blog/CV helper'ları ve PDF route'u raw
SQL/AWS/Better Auth error nesnesini client'a vermez. Server log'u yalnız context
ve hata sınıfı adını yazar; request body, password, cookie, token, presigned URL,
DB URL veya cloud credential loglanmaz. R2 cleanup log'u object/key/error
detayını içermez. Sentinel build taramasında Turso URL/token, auth secret ve R2
access/secret değerleri client JS/statik HTML içinde bulunmamıştır.

### Threat Checklist Sonucu

| Sınıf | Bu projedeki sonuç |
| --- | --- |
| Broken authentication / brute force / fixation | Better Auth, signup kapalı, scrypt, session rotation/lifetime ve 5/60 DB limiter; HTTPS cookie canlı doğrulaması pending |
| Broken authorization / IDOR | Bütün mutation'lar session+admin rolü ister; tek admin modelinde object ownership ayrımı yok, rastgele ID yalnız admin sonrası 404/validation üretir |
| CSRF | Auth route'larında Better Auth; custom mutation'larda cookie + SameSite + exact-origin/Fetch Metadata defense in depth |
| XSS / unsafe URL schemes | Tiptap allowlist, controlled React renderer, link protocol allowlist ve CSP; regression testleri geçti |
| SQL injection | Drizzle parameterized query ve Zod input; raw kullanıcı SQL'i yok |
| Mass assignment | Zod whitelist sonucu repository'de alanlar elle eşlenir |
| Secret/private/cache leakage | Server-only env, public DTO SQL filtreleri, client sentinel scan, admin/auth/PDF no-store |
| Open redirect | Login UI callback/returnTo kabul etmez; `/admin` yönlendirmesi sabit internal path; Better Auth trusted origin korunur |
| File upload / MIME spoofing / traversal | UUID key, signed PUT Content-Type, 5 MB exact HEAD, magic-byte, JPEG/PNG/WebP only |
| SSRF | Project URL'leri yalnız client linkidir; PDF remote fetch yapmaz; tek server fetch hedefi güvenilir R2 config'dir |
| Clickjacking / sniffing / referrer | CSP frame-ancestors none + DENY, nosniff, strict-origin-when-cross-origin |
| Verbose error/log leakage | Generic response; sanitized server log; raw SQL/AWS/auth error yok |

## Bekleyen Güvenlik Maddeleri

- Vercel deployment sonrası production `Secure`, `HttpOnly` ve `SameSite`
  cookie attribute'ları canlı response üzerinden doğrulanmalıdır.
- Vercel'in gerçek client IP header zinciri doğrulanmadan rate-limit IP header
  ayarı özelleştirilmemiştir. Database sayaç mekanizması uygulanmış ve local
  test edilmiştir.
- CSP uygulanmıştır; deployed browser console'da üçüncü taraf/Next runtime
  ihlali olmadığı gerçek production domaininde son kez doğrulanmalıdır.
- ~~Gerçek R2 Range GET / magic-byte, presign/PUT/HEAD/finalize testi~~ 1.8.3'te
  gerçek bucket ile yerelde doğrulandı (proje görseli ve blog kapağı).
- Production custom domain üzerinden R2 teslimi ve production origin için CORS
  preflight kontrolü deployment ile birlikte yapılmalıdır.
- R2 storage'dır; resize/format transformation sağlamaz. Cloudflare Images gibi
  bir optimizasyon servisi gelecek iyileştirmedir.
- Parola sıfırlama mail altyapısı olmadığı için eklenmemiştir; operator recovery
  süreci deployment belgesindedir. 2FA, tek admin için faydalı future hardening
  olarak kalır; Phase 5'te auth kararlılığını riske atacak yarım entegrasyon yapılmamıştır.
- Production Turso migration ve gerçek production admin bootstrap, credential
  sağlanmadığı için bu fazda çalıştırılmamıştır.
- ~~Blog cover için gerçek R2 cloud smoke testi~~ 1.8.3'te gerçek bucket ile
  doğrulandı.
- Blog için JSON-LD (`BlogPosting`) structured data bu fazda eklenmemiştir;
  script injection riskini gerçek veriyle doğru ele alacak bir tasarım
  netleşmeden ertelenmiştir (bkz. DECISIONS.md).
- Kategori/tag public filtre sayfaları (`/blog?category=`) ve tam metin arama
  bu fazın kapsamı dışında bırakılmıştır; veri modeli ileride filtrelemeyi
  engellemez.
- CV avatar/profil fotoğrafı upload akışı bu fazda eklenmedi (`profiles.avatar_media_id`
  şemada mevcuttur ama admin UI'da bağlanmadı); eklenirse mevcut R2
  presign/finalize güvenlik akışı (scope: `"cv"`) yeniden kullanılmalıdır,
  ikinci bir upload implementasyonu yazılmamalıdır.
- ~~Sosyal link (`social_links`) admin CRUD arayüzü eksikti.~~ Phase 8'de
  `/admin/social` ile tamamlandı (bkz. "Phase 8 Security Update").
- ATS Uyumluluk Kontrolü yalnızca bu projede tanımlanan deterministik kuralları
  test eder; gerçek bir işveren ATS ürününün (Workday, Greenhouse, Taleo vb.)
  davranışını simüle etmez veya onaylamaz (bkz. DECISIONS.md ADR-035).

## Phase 6 Security Regression

Phase 6 için yeni auth, mutation, upload, schema veya migration eklenmemiştir.
Anime.js ve Three.js npm dependency olarak bundle edilir; CDN, external script,
inline event handler, `dangerouslySetInnerHTML`, runtime eval veya arbitrary
remote script kullanılmaz. CSP gevşetilmemiştir. Mevcut production CSP unit
testi `unsafe-eval` ve wildcard bulunmadığını yeniden doğrulamıştır; development
HMR istisnası önceki Phase 5 kararıdır.

Skill Universe public sorgusu yalnız görünür skill alanlarını (`id`, `slug`,
`name`, `category`) ve yayınlanmış projelerden türetilmiş aggregate count'u
döndürür. Description/icon/display order, görünmez skill ve yayınlanmamış proje
bilgisi client DTO'ya girmez. Canvas yeni bir veri trust boundary değildir;
aynı minimum DTO'nun dekoratif görünümüdür. 49 unit/security testi ve beş
public/admin HTTP 200 regresyon kontrolü geçmiştir. Production Turso/R2/HTTPS
pending maddeleri bu fazda değişmemiştir.

## Phase 7 Security Specification

Phase 7'de yeni auth, admin mutation, upload, şema veya migration eklenmemiştir.
Yeni trust boundary'ler: public command index, terminal girdisi ve GitHub
REST API yanıtıdır.

### Terminal Execution Boundary

- Terminal girdisi yalnız sabit `terminalCommands` nesnesinde `Object.hasOwn`
  ile anahtar olarak aranır; prototip anahtarları (`constructor`, `__proto__`,
  `toString`) komut değildir.
- `eval`, `new Function`, `child_process`, dosya sistemi, ağ isteği, veritabanı
  komutu veya dinamik import yoktur; girdi sunucuya gönderilmez.
- Çıktı düz metin ve allowlist'ten geçmiş bağlantılardan oluşan React
  elemanlarıdır; `dangerouslySetInnerHTML` veya HTML string yoktur.
- Girdi 64 karakterle sınırlıdır; geçmiş yalnız bellekte tutulur (localStorage,
  cookie ve veritabanı kullanılmaz).
- Unit test: hostile girdiler (`constructor`, `__proto__`, `alert(1)`,
  `rm -rf /`, `eval('1')`, `projects; cv`) tek satırlık "Komut bulunamadı"
  yanıtı üretir ve bağlantı içermez.

### Command Navigation Allowlist

- Tüm palet/terminal/footer hedefleri `src/features/navigation/safe-href.ts`
  üzerinden geçer: internal hedef `/` ile başlamalı, `//`, `..`, `\` ve şema
  içermemelidir; external hedef yalnız kimlik bilgisi içermeyen `https:` URL'dir.
  `javascript:`, `data:`, `http:` hedefleri düşürülür.
- Proje/yazı yolları yalnız slug regex'ini (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) geçen
  değerlerden üretilir.
- Kullanıcının palete yazdığı metin yalnız filtrelemede kullanılır, URL'ye
  dönüştürülmez. External hedefler `window.open(..., "noopener,noreferrer")` ile,
  bağlantılar `rel="noopener noreferrer"` ile açılır.

### Social Link Protocol Hardening (Phase 7 bulgusu)

Phase 7 HTTP testi, fixture'a eklenen görünür bir `javascript:alert(1)` sosyal
bağlantısının `/cv` sayfasının RSC payload'ında ham olarak taşındığını
göstermiştir. React 19 bu URL'yi render sırasında engellediği için çalıştırılabilir
değildi; ancak aynı DTO PDF üretiminde de kullanılır ve savunma derinliği
açısından kabul edilemezdi. `getPublicCvData()` ve `getPublicSiteIdentity()`
artık yalnız `https:` sosyal bağlantıları döndürür. Social link admin arayüzü
olmadığından bu kayıtlar yalnız doğrudan veritabanı erişimiyle girilebilir;
kontrol yine de public DTO sınırında uygulanmıştır.

### GitHub Token Isolation

- `GITHUB_TOKEN` opsiyoneldir, yalnız `server-only` modülde okunur ve
  `NEXT_PUBLIC_` altında tanımlanmaz. Gerçek token dokümanlara yazılmamıştır.
- Production build client chunk taramasında `GITHUB_TOKEN` ve `api.github.com`
  dizgileri 0 kez bulunmuştur.
- Hata log'u yalnız `GITHUB_HTTP_<status>` veya hata mesajını yazar; header,
  token veya response body loglanmaz.

### External API Trust Boundary

- GitHub yanıtı Zod ile doğrulanır; `html_url` yalnız `https://github.com`
  olabilir, sayısal alanlar tip kontrolünden geçer, bilinmeyen alanlar atılır.
  Beklenen kullanıcı adıyla eşleşmeyen yanıt reddedilir.
- UI yalnız dar `GitHubProfileDTO` alır (username, name, profileUrl,
  publicRepoCount, repositories[name, url, description, language, stars,
  pushedAt]). E-posta, follower ve diğer alanlar DTO'ya girmez.
- İstek `redirect: "error"` ve 4 saniyelik `AbortSignal.timeout` ile sınırlıdır.
  Hata durumunda landing yalnız profil bağlantısı gösterir.
- Yalnız public uç noktalar kullanılır; private/non-public, fork ve arşiv
  repolar elenir; CMS'de private işaretli repo URL'leri listeden çıkarılır ve
  client'a gönderilmez.

### CSP Regression

Production CSP değişmemiştir: `connect-src 'self'`, `img-src` yalnız self/data/
blob ve yapılandırılmış R2 origin'i. GitHub verisi server-side alındığı için
browser `connect-src` iznine ihtiyaç yoktur; GitHub avatarı kullanılmadığı için
`img-src` genişletilmemiştir. `next start` ile alınan production `/admin/login`
response'unda CSP'de `github` geçmediği, `unsafe-eval`/wildcard olmadığı, HSTS
bulunduğu ve `X-Powered-By` olmadığı doğrulanmıştır.

### Phase 7 Pending

- Gerçek ekran okuyucu (NVDA/VoiceOver) ile manuel test yapılmamıştır; ARIA
  semantiği DOM üzerinden doğrulanmıştır.
- Deployed ortamda GitHub rate-limit davranışı (paylaşımlı çıkış IP'si) canlı
  gözlenmemiştir.
- ~~`social_links` admin CRUD arayüzü yoktu.~~ Phase 8'de eklendi; GitHub
  kullanıcı adı artık admin'den yönetilir, `GITHUB_USERNAME` yedek olarak kalır.

## Phase 8 Security Update

### Social Link URL Boundary

- Admin API sosyal bağlantı URL'sini `normalizeSocialUrl` ile yeniden ayrıştırır;
  yalnız kimlik bilgisi içermeyen `https:` kabul edilir. `javascript:`, `data:`,
  `vbscript:`, `http:`, `mailto:`, kontrol karakterli ve göreli değerler 400 alır
  (unit + HTTP + tarayıcı UI testi).
- Platform alanı sabit enum'dur; HTML/ikon/serbest şema değildir.
- Public DTO (`getPublicCvData`, `getPublicSiteIdentity`) Phase 7'den beri ayrıca
  https filtresi uygular; eski/manuel girilmiş kayıtlar da public'e çıkamaz.
- Tüm social mutation'lar `requireAdminApi()` kullanır: oturumsuz 401,
  oturumlu cross-origin 401 (HTTP testinde doğrulandı).

### Production Durumu

Proje sahibinin kararıyla Phase 8'de deploy yapılmamıştır. Bu nedenle aşağıdaki
maddeler **doğrulanmamıştır** ve pending kalır:

- HTTPS session cookie `Secure` bayrağı (canlı TLS yanıtı yok).
- Deploy edilmiş CSP/HSTS/header'lar ve browser console CSP ihlali kontrolü.
- R2 CORS'un gerçek bucket'a uygulanması, gerçek presigned PUT/HEAD/magic-byte/
  cleanup akışı.
- Turso production migration, FK doğrulaması, production admin bootstrap.
- Vercel'in gerçek client-IP header zinciri ve rate-limit davranışı.
- Production client asset'lerinde secret taraması (local build taraması Phase 7'de
  temizdi; production betiği hazır).

### Cloud Secret Isolation (tasarım)

- Secret'lar yalnız Vercel env'de tutulur; local işlemler için
  `vercel env run -e production -- <komut>` kullanılır, `.env` dosyası üretilmez.
  `.env*` ve `.vercel` `.gitignore` içindedir.
- Preview: salt-okunur Turso token, R2 credential yok, farklı auth secret
  (ADR-075/076). `*.vercel.app` wildcard trusted origin yoktur.
- Smoke betikleri secret değerini yazdırmaz; yalnız eşleşme sayısı raporlar.

### Failure-mode Leak Check (local production build)

Erişilemeyen dummy bir libSQL adresiyle `next start` altında: `/`, `/projects`,
`/cv` genel 500 sayfası, `/api/cv/pdf` generic JSON 500, sign-in boş gövdeli 500;
yanıtlarda `libsql`/`turso`/host/stack eşleşmesi 0; server log'unda dummy token
ve auth secret eşleşmesi 0. R2 route'ları hata tipinden başka bilgi loglamaz
(kod incelemesi).
