# Kişisel Portfolyo ve Teknik Blog — Proje Raporu

> **Not (1.9.0):** 1.9.0 ile yöneticinin yüklediği profesyonel PDF birincil public CV oldu; aşağıda anlatılan üretilen PDF yedek olarak korunur (FINAL_REPORT Bölüm 15.3, ADR-095).
>
> **Not (1.8.4):** Akademik teslim için güncel ve birleştirilmiş metin [FINAL_REPORT](FINAL_REPORT.md) dosyasıdır. Bu dosya geliştirme fazlarının tarihsel raporudur; içindeki test sayıları ve "R2 bekliyor" ifadeleri kendi dönemlerine aittir. R2 1.8.3'te gerçek bucket ile doğrulanmıştır.

## 1.8.0 Phase 18 — Certificates içerik modeli (2026-09-30)

Sertifikalar, proje/blog/CV verilerinden ayrı bir `certificates` tablosunda tutulur. Başlık zorunlu, diğer alanlar ve doğrulama linki isteğe bağlıdır; admin formu içerik ve iki bağımsız bayrağı (`isVisible`, `showInCv`) yönetir. Public landing yalnız `isVisible` kayıtlarını, web ve PDF CV yalnız her iki bayrağı açık kayıtları alır. Landing'deki sıralı Data Spine bölümü boş veride render edilmez. Doğrulama URL'si HTTPS ile sınırlandırılır. Phase 18 final kapılarının sonucu [TEST_LOG](TEST_LOG.md) içinde kaydedilir; aşağıdaki eski sürüm metinleri tarihsel kayıttır.

## 1.2.0 — Scroll-driven public anlatı

Landing'de tek prosedürel obje Hero/core → About/flow → Projects/build → Skills/network → Journey/path → sakin Blog/CV → Contact/core sırasıyla dönüşür. Görsel katman public DTO'ları değiştirmez; backend, auth/admin, CV/PDF ve migration kapsam dışında tutuldu. React scroll state yerine cache edilmiş bölüm ölçüleri, refs/CSS transform ve imperative Three subscription kullanıldı. Mobile sadeleştirme, OS/kullanıcı reduced-motion ve SSR CSS/HTML fallback erişilebilir progressive enhancement sağlar. Gerçek test sonuçları ve ölçülmeyen maddeler [UX raporunda](UX_PHASE_REPORT.md) kayıtlıdır.

## 1.1.0 — Korunan UX/CV özellikleri ve önceki hareket mimarisi (2026-09-26)

`shortBio` yalnız landing Hero'da; `longBio` Hakkımda'da kullanılır. CV özeti override → longBio → bölüm yok sırasını izler. Eğitim programı opsiyoneldir; boş/dash-only içerik render edilmez, eski kayıt değiştirilmez. Timeline yalnız eğitim ve deneyimdir; projeler showcase içinde kalır.

Profile `phone` / `isPhoneVisible` ve Social Links `showInCv` additive migration ile eklendi. Telefon güvenli `tel:` normalizasyonu ve görünürlük filtresiyle Contact/web CV/PDF'e ulaşır. CV ve CV shell yalnız `isVisible && showInCv` linklerini alır. GitHub/LinkedIn/Website CV varsayılanı true, diğerleri false; admin değiştirebilir. Instagram, Behance, Dribbble dahil platformlar desteklenir.

PDF artık yerel OFL lisanslı Noto Sans Regular/Bold TTF kullanır; Helvetica kararı bu sürümde geçersiz kılınmıştır. Tek kolon/selectable metin korunur. Terminal header yardımcı kontrolüne taşındı; footer bio/admin/version tekrarlarından arındırıldı. Landing arka planı fixed üç katman, rAF/CSS variables ve section IntersectionObserver kullanır; reduced-motion statiktir. Mevcut Three/Anime sistemleri korunur. FPS/ATS-vendor kabulü iddiası yoktur.

Güncel doğrulama ve sınırlamalar: [UX phase raporu](UX_PHASE_REPORT.md). Önceki phase test sayıları ve kararları tarihsel kayıttır.


Son güncelleme: 24 Eylül 2026

## 1. Projenin Tanımı

Bu çalışma; kişisel vitrin, portfolyo, proje tanıtım sistemi, teknik blog, web
CV, PDF CV üretimi ve tek kullanıcılı yönetim panelini aynı web uygulamasında
birleştirmeyi hedefleyen üniversite bitirme projesidir. Phase 2 kapsamında
Project CMS, R2 medya akışı ve public proje vaka çalışmaları tamamlanmıştır.
Phase 3 kapsamında Tiptap tabanlı Blog CMS, kategori/etiket sistemi, cover
medya akışı, public blog sayfaları ve içerik güvenliği (XSS) katmanı
tamamlanmıştır. Phase 4 kapsamında Profile/Education/Experience/Skills
yönetimi, CV ayarları, tek veri kaynağından üretilen public web CV, server-side
PDF CV üretimi ve deterministik ATS Uyumluluk Kontrolü tamamlanmıştır.

## 2. Projenin Amacı

Amaç; ziyaretçilerin proje sahibini, yeteneklerini, projelerini, yazılarını ve
CV'sini inceleyebileceği; içerik sahibinin ise ileride bütün içeriği güvenli bir
yönetim panelinden yönetebileceği profesyonel bir yayın platformu oluşturmaktır.
Proje alanı bu fazda gerçek içerik yönetimine açılmıştır.

## 3. Problemin Tanımı

Kişisel çalışmaların farklı platformlara dağılması; proje bağlamının, teknik
kararların ve güncel CV bilgisinin tek bir güvenilir kaynaktan sunulamamasına
neden olmaktadır. Proje bu içeriği merkezi, güncellenebilir ve güvenli bir
yapıda bir araya getirmeyi amaçlar.

## 4. Projenin Kapsamı

Planlanan kapsam public landing page, proje ve blog liste/detay sayfaları, web
CV, PDF CV ve tek admin kullanıcılı yönetim panelidir. Phase 2; Project CMS,
medya ve public project showcase alanını kapsar. Phase 3; Blog CMS, Tiptap
editör, kategori/etiket sistemi ve public blog sayfalarını kapsar. Phase 4;
Profile/Education/Experience/Skills CRUD, CV ayarları, public web CV, PDF CV
üretimi ve ATS Uyumluluk Kontrolü'nü kapsar. Bu sistem yalnızca site sahibinin
kendi CV'sini yönettiği tek kullanıcılı bir modeldir; dış kullanıcılara CV
oluşturma veya çok kullanıcılı CV builder kapsam dışıdır. Phase 6'da animasyon
ve 3D public vitrini, Phase 7'de server-side GitHub Public API entegrasyonu,
komut paleti ve güvenli terminal; Phase 8'de Social Links CMS eklenmiştir.

## 5. Kullanılan Teknolojiler

Mevcut sürümde Next.js 16.3.6, React 19.2.8, TypeScript 5, Tailwind CSS 4,
Turso/libSQL, Drizzle ORM 1.0 RC, Drizzle Kit, Better Auth 1.7.5, Zod ve AWS SDK
v3 S3/R2 istemcisi kullanılmaktadır. Space Grotesk, Geist ve JetBrains Mono
`next/font` ile self-host edilir. Phase 3'te editör için `@tiptap/react`,
`@tiptap/pm`, `@tiptap/starter-kit` ve `@tiptap/extension-link` (3.31.3)
eklenmiştir; public tarafta içerik, kütüphane bundle'ı yüklenmeden elle
yazılmış bir React renderer ile sunulur (bkz. Bölüm 12). Phase 4'te PDF CV
üretimi için `@react-pdf/renderer` (4.9.0, stable, React 19 peer desteği
doğrulanarak) eklenmiştir. Phase 6 DOM hareketi için Anime.js 4.5.0, prosedürel
WebGL görselleştirmesi için vanilla Three.js 0.186.0 kullanır.

## 6. Sistem Mimarisi

App Router tabanlı tek Next.js uygulamasında browser, Next.js server boundary,
authorization, validation, repository/DTO, Drizzle ve Turso katmanları
ayrılmıştır. Public proje sayfaları request anında server-render edilir;
database modülü lazy import edildiği için credential olmadan build tamamlanır.
Admin JSON Route Handler'ları her mutasyonda yeniden rol kontrolü yapar.

## 7. Veritabanı Tasarımı

Turso/libSQL uyumlu ilişkisel şema oluşturulmuş ve Drizzle migration'ı
üretilmiştir. Profile, social links, education, experiences, skills, projects,
project images, posts, categories, tags, media, CV settings ve site settings
domain'leri modellenmiştir. Skill ve proje teknolojileri tek katalog ile
`project_skills` junction tablosunda; post/tag ilişkisi `post_tags` tablosunda
tutulur. Foreign key, unique slug, index, check constraint ve kontrollü cascade
kuralları migration'a yansıtılmıştır. Phase 4'te üç minimal, additive kolon
yeni bir migration'la eklenmiştir (eski migration değiştirilmedi): `profiles.is_location_visible`
(mevcut `is_email_visible` pattern'iyle tutarlı gizlilik anahtarı),
`projects.include_in_cv` (CV'de gösterilecek projelerin işaretlenmesi) ve
`cv_settings.max_projects` (CV'de gösterilecek azami proje sayısı).

## 8. Kullanıcı Arayüzü

Modern, koyu, teknik ve responsive bir landing page geliştirilmiştir.
Semantik başlık sırası, klavye odak göstergeleri, ana içeriğe geçiş bağlantısı
ve 320 pikselden başlayan mobil düzen uygulanmıştır. Project cover ana görsel,
cover yoksa kırılmayan metinsel fallback olarak sunulur. Galeri carousel/modal
yerine klavye ve ekran okuyucu açısından daha güvenilir responsive grid'dir.

## 9. Yönetim Paneli

`/admin/login` Better Auth email/password ile gerçek giriş yapar. Loading ve
genel hata durumları erişilebilir biçimde sunulur. Public signup kapalıdır.
`/admin`, session ve admin rolü sunucuda doğrulanmadan görüntülenmez. `/admin/projects`,
oluşturma ve düzenleme sayfaları proje/skill/yayın/medya işlemlerini sağlar.
Route Handler mutasyonları layout korumasına güvenmeyip merkezi API admin
kontrolünü tekrarlar. İlk admin CLI'nin gizli parola prompt'u ile oluşturulur.

## 10. Güvenlik Önlemleri

Phase 0 header'larına ek olarak database/auth secret doğrulaması, trusted origin,
server-side authorization, public signup engeli, yedi günlük database session ve
database tabanlı login rate limit uygulanmıştır. Better Auth'ın CSRF/origin ve
güvenli cookie varsayımları kapatılmamıştır. Zod whitelist validation, özel/public
DTO ayrımı, imzalı tek-object upload, MIME/5 MB kontrolü, finalize `HEAD`
doğrulaması ve rastgele key üretimi eklenmiştir. Phase 5'te CSP, custom mutation
origin kontrolü ve R2 magic-byte doğrulaması ayrıca tamamlanmıştır.

## 11. CV ve PDF Üretim Sistemi

Phase 4'te tamamlanmıştır. `/admin/profile`, `/admin/education`,
`/admin/experience`, `/admin/skills` ve `/admin/cv` sayfaları sırasıyla profil,
eğitim, deneyim, yetenek ve CV ayarlarını yönetir. Hiçbiri ikinci bir veri
kopyası oluşturmaz: web CV, PDF ve landing sayfası hepsi aynı
`getPublicCvData()` fonksiyonundan (`src/server/cv/repository.ts`) beslenir —
bu fonksiyon "tek veri kaynağı" ilkesinin somut uygulamasıdır. Gizlilik sınırı
sunucu tarafında uygulanır: `profiles.is_email_visible` ve
`profiles.is_location_visible` false ise e-posta/konum hiçbir zaman DTO'ya,
dolayısıyla HTML'e veya PDF'e dahil edilmez (yalnız CSS ile gizleme değildir).
CV'ye dahil edilecek projeler `projects.include_in_cv` alanı (mevcut
featured/published pattern'iyle birebir aynı admin UI ve API akışı) ile
işaretlenir; `cv_settings.max_projects` gösterilecek azami proje sayısını
sınırlar. Bölüm sırası ve görünürlüğü `cv_settings.section_order` /
`section_visibility` JSON alanlarıyla yönetilir; boş içerikli bölümler,
görünür işaretlense dahi hiç render edilmez. PDF, `@react-pdf/renderer` ile
tamamen sunucu tarafında (`GET /api/cv/pdf`, Node.js runtime) üretilir; A4, tek
kolon, Noto Sans (1.1.0 yerel Unicode font), metin tabanlı (seçilebilir/
aranabilir), grafik/ikon/fotoğraf/skill-bar içermeyen ATS-first bir şablondur.
Ayrıca deterministik bir "ATS Uyumluluk Kontrolü" (`src/features/cv/ats-rules.ts`)
admin CV ekranında 0-100 arası bir site-içi skor ve geçti/uyarı/başarısız
listesi gösterir; bu skorun gerçek bir üçüncü taraf ATS sonucu olmadığı hem
admin UI'da hem dokümantasyonda açıkça belirtilir (bkz. Bölüm 19-20).

## 12. Blog Sistemi

Blog CRUD Phase 3'te uygulanmıştır. `/admin/blog`, `/admin/blog/new`,
`/admin/blog/[id]/edit` ve `/admin/blog/categories` yazı/kategori yönetimini
sağlar. İçerik, Tiptap editörüyle üretilip ProseMirror JSON olarak
`posts.content` alanına yazılır. Yazma yolunda (server tarafında) JSON,
yalnızca izin verilen düğüm/mark/link protokolü kümesiyle normalize edilir;
izin dışı bir yapı (`<script>`, `image`, `iframe`, `javascript:` linki vb.)
HTTP 400 ile reddedilir ve hiçbir zaman veritabanına yazılmaz. Public
`/blog/[slug]` sayfası bu JSON'u `dangerouslySetInnerHTML` kullanmadan,
düğüm türü başına sabit bir React elemanına eşleyen elle yazılmış bir
renderer (`src/features/blog/render-content.tsx`) ile sunar; böylece
üretilen HTML formal olarak yalnızca allowlist'teki etiketlerden oluşur.
Kategori (`categories`) opsiyoneldir, etiket ilişkisi (`post_tags`) çoktan
çoğadır ve admin hem var olan etiketi seçebilir hem de yeni etiketi
find-or-create mantığıyla (slug normalize edilerek) oluşturabilir. Cover
görseli Project CMS ile aynı R2 presign/finalize güvenlik akışını
(`blog/{postId}/{uuid}.{ext}` namespace'i ve ortak HMAC upload bileti ile)
yeniden kullanır. Draft/published ayrımı `posts.status` alanı ve veritabanı
check constraint'iyle uygulanır; public sorgular yalnızca `status = 'published'`
kayıtları döndürür, draft detay isteği 404 verir.

## 13. Proje Yönetim Sistemi

Create, read, update ve delete işlemleri gerçek database üzerinde uygulanmıştır.
Proje ile `project_skills` güncellemesi transaction içinde atomiktir. Publish ve
featured durumları yönetilebilir; slug benzersizliği ve skill varlığı sunucuda
kontrol edilir. Public `/projects` yalnız published kayıtları, `/projects/[slug]`
ise cover, overview, rol, tarih, problem, çözüm, mimari, galeri ve dış bağlantıları
case-study sırasıyla sunar. Private repository URL'si public SQL projeksiyonunda
`NULL` üretilir ve yalnız “Private repository” etiketi görünür.

## 13.1. Medya Yönetimi ve Cloudflare R2

Admin, 5 dakikalık `PutObject` presigned URL ile binary dosyayı doğrudan R2'ye
gönderir. Server-generated key `projects/{projectId}/{UUID}.{ext}` biçimindedir.
Finalize bileti HMAC ile project/key/MIME/boyut/expiry değerlerini bağlar. Finalize
işlemi R2 `HeadObject` ile varlık, exact MIME ve exact/azami boyut doğruladıktan
sonra `media` ve `project_images` kayıtlarını transaction içinde oluşturur.
Cover partial unique index ile tektir; galeri yukarı/aşağı işlemi sıralamayı
transaction içinde yeniden düzenler. Width/height browser decode sonucudur ve
güvenlik kararı için kullanılmaz. Gerçek R2 testi 1.8.3'te yapılmış; proje görseli ve blog kapağı yüklemesi doğrulanmıştır.

## 14. Animasyon ve 3D Teknolojileri

Anime.js ve Three.js Phase 0'da bilinçli olarak ertelenmiş, içerik ve güvenlik
katmanları tamamlandıktan sonra Phase 6'da progressive enhancement olarak
eklenmiştir. Ayrıntılı sistem, lifecycle ve test sonuçları Bölüm 23'tedir.

## 15. Performans ve Erişilebilirlik

Erişilebilirlik temeli korunmuştur. Public proje ve CV sayfaları Server
Component, yalnız admin formları/medya işlemleri Client Component'tir. Anlamlı
alt metin zorunludur; galeri semantik figure/grid kullanır. Pending/error ve
empty state'ler sunulur. Public `/cv` semantik `<section>`/`<time>` elemanları,
gerçek `<a href>` bağlantıları ve başlık hiyerarşisi (`h1` ad, `h2` bölüm
başlıkları) kullanır; admin CV formları label/checkbox ilişkilendirmesi ve
klavye ile kullanılabilir yukarı/aşağı sıralama düğmeleri içerir. PDF üretimi
tamamen sunucu tarafında olduğu için public kullanıcıya Tiptap/react-pdf
runtime'ı hiç gönderilmez; `/cv` sayfası da salt Server Component'tir. Otomatik
axe denetimi henüz gerçekleştirilmemiştir.

## 16. Testler

ESLint, Zod unit testleri ve secret olmadan production build başarılıdır. Mevcut
migration geçici libSQL'e uygulanmıştır. Gerçek HTTP üzerinden CRUD, authorization,
duplicate/invalid input, nonexistent skill, unpublished filtreleme, private URL
sızıntısı, SVG/oversize ve arbitrary finalize token senaryoları doğrulanmıştır.
Phase 3'te aynı geçici local libSQL + gerçek admin bootstrap yaklaşımıyla blog
CRUD, authorization, geçersiz kategori/etiket ID, malformed/desteklenmeyen
Tiptap JSON, `javascript:`/`<script>` payload reddi, draft sızıntısı ve cover
upload abuse senaryoları (`tests/phase3-http.mjs`, 12/12 geçti) doğrulanmıştır.
Phase 4'te aynı yöntemle CV/ATS unit testleri (`tests/cv-validation.test.ts`,
`tests/ats-rules.test.ts`, toplam 20 yeni test) ve gerçek HTTP entegrasyon
testleri (`tests/phase4-http.mjs`, 18/18 geçti) eklenmiştir: authorization,
tarih tutarlılığı/slug validasyonu, gizli e-posta/konum sızıntısı, yayınlanmamış
proje CV'ye sızmaması, gizli yeteneğin CV'de görünmemesi, PDF endpoint header'ları,
`%PDF` imza kontrolü ve — özellikle — profil headline değişikliğinin hem
`/cv` hem yeniden üretilen PDF'e aynı anda yansıdığının doğrulanması ("tek veri
kaynağı" iddiasının teknik kanıtı) test edilmiştir. PDF içeriğinin gerçekten
metin tabanlı (seçilebilir/aranabilir) olduğu, yalnızca Node'un yerleşik `zlib`
modülünü kullanan küçük, bağımlılıksız bir PDF metin çıkarım yardımcısıyla
(`tests/pdf-text-extract.mjs`) otomatik olarak doğrulanmıştır — bkz. Bölüm 17
ve TEST_LOG.md. Gerçek Turso/R2 credential olmadığı için cloud smoke testi
çalıştırılmamıştır.

## 17. Karşılaşılan Problemler ve Çözümleri

Better Auth CLI'nin `server-only` modülü yükleyememesi, ortak config kullanan
ayrı bir CLI entry point ile çözüldü. Drizzle 1.0 RC ile Better Auth Relations v1
çıktısı uyumsuz olduğu için resmi Relations v2 adapter'a geçildi. İlk build'de
eski Drizzle client config parametresi TypeScript hatası verdi; gereksiz parametre
kaldırıldı. Phase 2 ilk build'i eager repository import'u nedeniyle env istedi;
runtime lazy DB importuyla düzeltildi. İlk `tsx` sandbox denemesi Windows kullanıcı
bilgisi hatası verdi ve host testinde tekrarlandı. Türkçe slug testi combining
mark hatasını buldu; dönüşüm sırası düzeltildi. İlk HTTP login Origin header'ı
olmadığı için 403 verdi; test istemcisi gerçek same-origin header ile düzeltildi.
Phase 3 build'inde `getPublicPost`'un ortak `attachPublicExtras` yardımcı
fonksiyonu satır tipi (`seoTitle`/`seoDescription`) daraltıp TypeScript hatası
verdi; fonksiyon generic hale getirilerek satırın tam tipi korundu.
Phase 4'te `cvSettingsInputSchema`'daki `z.record(z.enum(...), z.boolean())`
kullanımı Zod v4'te "tüm anahtarlar zorunlu" tam Record tipi ürettiği için
kısmi (opsiyonel anahtarlı) `sectionVisibility` objesiyle tip uyuşmazlığı
verdi; `z.partialRecord` API'sine geçilerek düzeltildi. İlk PDF metin çıkarım
denemesinde react-pdf'in `TJ` operatöründe hex-encoded (`<...>`) string
kullandığı görüldü (yalnız literal `(...)` string bekleniyordu); çıkarıcı hem
literal hem hex string token'larını okuyacak şekilde güncellendi. İlk HTTP
entegrasyon testi çalıştırmasında bir eğitim fixture'ının `program` alanı
minimum 2 karakter kuralını ihlal ettiği (`"X"`) için 400 döndü; fixture
düzeltildi. Bölüm görünürlüğü testi ilk denemede başarısız oldu çünkü bir
projeye bağlı yetenek adı, "Yetenekler" bölümü kapatılsa da proje kartının
teknoloji etiketinde haklı olarak görünmeye devam ediyordu; bu uygulama hatası
değil, test asersiyonunun yanlış varsayımıydı — test, bölüm başlığının
(`id="cv-skills"`) kaybolduğunu kontrol edecek şekilde düzeltildi.

## 19. ATS Uyumluluk Kontrolü

Site içi "ATS Uyumluluk Skoru" (0-100), `src/features/cv/ats-rules.ts` içinde
tanımlanan 12 deterministik kuralın ağırlıklı ortalamasıdır: her kural
`pass`/`warning`/`fail` durumu üretir (kredi sırasıyla 1/0.5/0), skor
`Σ(ağırlık × kredi) / Σ(uygulanabilir ağırlık) × 100` formülüyle hesaplanır ve
uygulanamaz kurallar (örn. hiç deneyim yokken "deneyim tarihleri tutarlı mı"
kuralı) hem pay hem paydadan tamamen çıkarılır. Kurallar arasında ad/unvan/özet
varlığı, e-posta görünürlüğü, özet uzunluğu, yetenek/eğitim/proje varlığı,
deneyim tarih tutarlılığı ve üç yapısal garanti (standart bölüm başlıkları,
grafik/skill-bar kullanılmaması, metin tabanlı içerik) bulunur. Sistem
tamamen yerel, açıklanabilir ve test edilebilirdir; herhangi bir yapay zekâ
modeli veya harici ATS servisi kullanmaz. Admin `/admin/cv` ekranında skor,
her kuralın geçti/uyarı/başarısız durumu ve açıklaması listelenir; hem arayüz
hem bu belge, skorun gerçek bir işveren ATS sisteminin (LinkedIn, Workday vb.)
sonucu olmadığını, yalnızca bu projede tanımlanan format/içerik kurallarına
göre hesaplanan bir gösterge olduğunu açıkça belirtir.

## 20. Sonuç

Phase 2 sonucunda authorization kontrollü Project CMS, R2'ye hazır medya yaşam
döngüsü, public case-study ekranları ve private/public veri sınırı oluşturulmuştur.
Phase 3 sonucunda aynı güvenlik ilkeleriyle Blog CMS, Tiptap tabanlı yapılandırılmış
içerik üretimi, allowlist tabanlı XSS önlemi ve public blog ekranları eklenmiştir.
Phase 4 sonucunda profil/eğitim/deneyim/yetenek yönetimi, tek veri kaynaklı
public web CV, server-side metin tabanlı PDF CV üretimi ve deterministik ATS
Uyumluluk Kontrolü eklenmiştir. Phase 5 sonucu aşağıdaki production güvenlik
sertleştirmesi ve doğrulama bölümlerinde raporlanmıştır.

## 21. Production Security Hardening (Phase 5)

Phase 5'te authentication, authorization, session, admin mutation, Turso, R2,
rich text, public DTO, PDF, validation, headers ve rate-limit sınırları yeniden
incelenmiştir. Mevcut Zod/Drizzle/Better Auth korumaları kopyalanmamış; yalnız
eksik sınırlar güçlendirilmiştir. Custom admin mutation'larına exact-origin /
Fetch Metadata kontrolü, production runtime environment kuralları, R2 Range GET
magic-byte doğrulaması ve secret taşımayan generic log/error yaklaşımı eklenmiştir.

### CSP ve Security Headers

Next.js 16'nın repository içindeki resmî CSP rehberi esas alınmıştır. Request
nonce'u bütün sayfaları dynamic yapıp static optimization/CDN kabiliyetini
kaldıracağı için kullanılmamıştır. Statik CSP; `default-src 'self'`, self ile
sınırlı script/style/connect/font, yalnız self/data/blob ve yapılandırılmış R2
image origin'i, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`,
`frame-src 'none'`, `form-action 'self'` uygular. Next/React bootstrap ve mevcut
inline style kullanımı nedeniyle production'da dar kapsamlı `unsafe-inline`
script/style istisnası vardır; `unsafe-eval` yalnız development HMR'da açılır.
Wildcard yoktur. Production'da `upgrade-insecure-requests` ve bir yıllık, preload/
subdomain kapsamı olmayan HSTS uygulanır. Mevcut `nosniff`, `DENY`, referrer ve
camera/microphone/geolocation kapatma politikaları korunmuştur.

### Authentication Production Configuration

Public signup kapalı, parola 12–128 karakter, session süresi yedi gün ve yenileme
aralığı bir gündür. Login database rate limit'i 5/60 saniye olarak tekrar
doğrulanmıştır. Better Auth trusted origin gerçek base URL'dir; Secure/HttpOnly/
SameSite varsayımları custom kodla tekrarlanmamıştır. Local HTTP testinde
HttpOnly, SameSite=Lax, Path ve expiry doğrulanmış; `Secure` davranışının gerçek
deployed HTTPS ortamında doğrulanması açık pending tutulmuştur.

### Cloud Storage ve Environment Security

R2 presign/finalize akışı HEAD metadata kontrolünden sonra JPEG/PNG/WebP binary
imzasını ilk 16 byte Range GET ile doğrular. SVG/GIF, 5 MB üstü, farklı MIME,
farklı exact size ve sahte token reddedilir. CORS kuralı production/local exact
origin + PUT + Content-Type ile `DEPLOYMENT.md` içinde verilmiştir. Production
public origin için custom domain önerilir; r2.dev development ile sınırlıdır.
Environment doğrulaması build'i secretsız bırakır, yalnız ilgili runtime'da
fail eder. Sentinel secret'larla build sonrası client JS/HTML taraması beş kritik
değer için sıfır eşleşme vermiştir.

### Production Verification

44 unit/security testi ve 7 gerçek HTTP security grubu geçmiştir. HTTP testleri
beş public/admin sayfada CSP/header'ları, cache politikasını, dokuz admin mutation
sınıfını, signup kapalı durumunu, cookie attribute'larını, authenticated
cross-origin reddini ve PDF generic/no-store 404 yanıtını doğrulamıştır. Login
rate-limit tekrarında durumlar `401,401,401,429,429,429` olmuştur. Lint, secretsız
ve sentinel-env production build, npm audit (0 vulnerability) başarılıdır.
Production Turso/R2 smoke testleri credential olmadığı; HTTPS cookie doğrulaması
deployed HTTPS environment olmadığı için yapılmamıştır.

## 22. Phase 5 Sonucu

Uygulama production deploy öncesi kod ve konfigürasyon düzeyinde sertleştirilmiş,
deployment checklist oluşturulmuş ve security specification güncellenmiştir.
Phase 6 için önerilen sonraki adım, güvenlik kapsamını genişletmeden gerçek
Vercel/Turso/R2 ortamında checklist'i yürütmek; ardından planlanan progressive
enhancement/animasyon fazına geçmektir.

## 23. Phase 6 — Public Vitrin ve Hareket Sistemi

Phase 6, backend/auth/database/CV-PDF sınırlarını değiştirmeden public vitrini
progressive enhancement yaklaşımıyla geliştirmiştir. Landing içeriği Server
Component olarak gerçek HTML üretmeye devam eder; Anime.js ve Three.js yalnız
hydration sonrasında görsel/etkileşim katmanı ekler. İsim, headline, özet,
iletişim, eğitim ve deneyim `getPublicCvData()`; projeler mevcut public project
repository; yazılar public blog repository üzerinden gelir. Yeni migration yoktur.

### Anime.js Animation System ve Scroll-based Interaction

Anime.js 4.5.0'ın `animate`, `stagger`, `createScope` ve güncel `onScroll`
API'leri kullanılmıştır. `PageMotion`, tek bir merkezi `IntersectionObserver`
ile `[data-reveal]` elemanlarını gözler; her kart için ayrı observer üretmez.
Hero kısa opacity/translate stagger ile açılır. Timeline çizgisi tek Anime.js
ScrollObserver ile `scaleY` üzerinden ilerler. `scope.revert()` ve observer
cleanup unmount sırasında instance/listener durumunu temizler. Layout etkileyen
boyut/konum yerine transform ve opacity kullanılır. Blog detail ile `/cv` bu
controller'ı yüklemez; blog/project listeleri yalnız hafif reveal alır.

### Three.js Hero ve WebGL2 Fallback

Hero, sıradan küp yerine seeded prosedürel bir “digital constellation”dır:
Icosahedron wireframe çekirdek, tek Points ve tek LineSegments objesi kullanır.
Texture, model, HDR, fizik, post-processing ve bloom yoktur. Pointer yalnız
küçük rotasyon hedefi üretir; scroll progress kamerayı yaklaştırır/geri çeker,
grubu genişletir/döndürür ve node opacity'sini değiştirir. React state scroll
event'lerinde güncellenmez; mutable scene değerlerini render loop okur.

Renderer'dan önce `canvas.getContext("webgl2")` kontrol edilir. Destek yoksa
veya constructor hata verirse canvas eklenmez; CSS network kompozisyonu ve HTML
hero içeriği görünür kalır. Hata yalnız development console'una sınırlı bağlamla
yazılır. WebGLRenderer yeterli ve daha kontrollü olduğu için experimental
WebGPURenderer kullanılmamıştır.

### Skill Universe ve Career Timeline

Skill Universe yalnız görünür skill ve yayınlanmış proje ilişkilerinden minimum
DTO üretir: `id`, `slug`, `name`, `category`, `publicProjectCount`. Admin
metadata client'a gitmez. Three katmanı Points + LineSegments + seçili marker
kullanır; 3D font yoktur. Aynı veri her zaman gerçek HTML button listesinde
sunulur; hover, focus ve tap aynı seçimi günceller. WebGL/JS başarısızlığı bilgi
kaybı yaratmaz.

Career Timeline saf builder ile yalnız görünür education/experience
kayıtlarını birleştirir. Projeler ayrı showcase içinde kalır;
olaylar deterministik olarak sıralanır. Veri yoksa bölüm render edilmez;
sahte olay veya tarih üretilmez.

### Responsive Animation Strategy ve Reduced Motion

`selectMotionQuality` dört kademe üretir: reduced-motion `static`, dar/iki
çekirdekli cihaz `mobile`, orta viewport/dört çekirdek `tablet`, diğerleri
`desktop`. Hero node sayıları 24/30/48/72; skill client node üst sınırı
mobile/tablet/desktop için 24/40/64'tür. DPR static/mobile 1, tablet 1.25,
desktop 1.5 ile sınırlanır. 390 px browser smoke ve yaklaşık %200 zoom
kontrolünde yatay taşma gözlenmemiştir.

Reduced-motion'da Anime.js translate/reveal çalışmaz, timeline çizgisi tam
görünür, scroll-linked Three hareketi ve sürekli loop durur; sahne bir kez
render edilir. İçerik ve erişilebilir HTML eksilmez.

### Performance Optimization ve Resource Lifecycle

Hero ve Skill Universe `next/dynamic({ ssr: false })` ile yalnız landing'de
yüklenir. `/blog/[slug]`, `/cv` ve admin browser smoke testlerinde canvas sıfırdır.
ResizeObserver canvas ölçüsünü günceller. IntersectionObserver viewport dışındaki,
Visibility API gizli sekmedeki loop'u durdurur. Unmount; RAF iptali, listener/
observer cleanup, geometry/material dispose, renderer dispose ve canvas removal
yapar. `renderer.info` production UI'a çıkmaz. FPS ölçülmediği için 60 FPS
garantisi verilmez.

### Phase 6 Doğrulama Sonucu

Lint ve production build başarılıdır. Toplam 49 unit/security testi geçmiştir;
5'i Phase 6 kalite/DPR/timeline/skill DTO testidir. İlk test komutu Node 24
`uv_os_get_passwd ENOMEM` ortam hatasıyla test dosyalarına ulaşmadan durmuş,
yalnız test çalıştırmasına özel geçici `os.userInfo` shim'i ile aynı komut
başarıyla tamamlanmıştır; uygulama koduna workaround eklenmemiştir. İlk browser
çalıştırması env olmadan beklenen DB runtime hatasını göstermiş; migration'lı
geçici local libSQL fixture ile tekrarlandığında landing ve beş regresyon rotası
200 dönmüştür. Uygulama içi tarayıcıda desktop/mobile ekran, canvas, gerçek
reduced-motion, Skill tap, semantik HTML ve taşma kontrol edilmiştir. Chrome
provider mevcut değildi; bu sınır TEST_LOG'da tutulur.

## 24. Phase 7 — Geliştirici Odaklı Deneyim ve UX Polish

Phase 7, veritabanı şeması, kimlik doğrulama, admin paneli ve Phase 6 görsel
sistemi yeniden tasarlanmadan public sitenin son kullanıcı açısından daha
profesyonel ve geliştirici odaklı hâle getirilmesini amaçlamıştır. Yeni
migration, yeni runtime dependency veya yeni CSP istisnası eklenmemiştir. Tüm
yeni özellikler mevcut public repository/DTO katmanlarından beslenir ve
progressive enhancement ilkesine uyar: JavaScript veya dış servis çalışmasa da
temel navigasyon ve içerik HTML olarak erişilebilir kalır.

### Command Palette

`Ctrl+K` (Windows/Linux) veya `Cmd+K` (macOS) ile açılan global bir komut paleti
uygulanmıştır. Palet; ana sayfa, projeler, blog, CV, yetenekler, kariyer zaman
çizgisi ve iletişim gibi public route/bölümleri, yayınlanmış projeleri, son sekiz
yayınlanmış blog yazısını, CV PDF indirmeyi, GitHub profilini, görünür sosyal
bağlantıları ve terminali açma komutunu listeler. Admin bağlantısı palete
eklenmemiştir. Komut listesi sunucuda `getPublicShellData()` tarafından yalnız
public sorgulardan (`listPublicProjectIndex`, `listPublicPosts`,
`listPublicSkillIndex`, `getPublicSiteIdentity`) üretilir; yayınlanmamış proje,
taslak yazı, gizli yetenek, gizli e-posta/konum ve görünmez bağlantı bu veriye
girmez. Bu özellik HTTP testinde bilinçli olarak yerleştirilmiş gizli fixture
değerleriyle doğrulanmıştır.

Arama; ad, anahtar kelime ve grup adı üzerinde basit, Türkçe karakter
duyarsız bir eşleştirmedir (`filterCommands`). Tam metin arama veya yeni bir
arama backend'i kurulmamıştır. Palet vanilla React ile yazılmış ve ilk açılışta
`next/dynamic` ile yüklenen 8.1 KB'lık ayrı bir client chunk'ına ayrılmıştır;
başlangıç bundle'ında yalnız kısayol dinleyicisi ve context bulunur.

### Keyboard Navigation ve Erişilebilirlik

Palet, terminal ve galeri lightbox'ı ortak `ModalDialog` bileşenini kullanır.
Bileşen yerel `<dialog>.showModal()` API'si ile arka planı inert hâle getirir,
Tab/Shift+Tab odak döngüsünü diyalog içinde tutar, Escape ve backdrop tıklaması
ile kapanır ve kapanışta odağı diyaloğu açan elemana geri verir. Palet WAI-ARIA
combobox + listbox desenini (`aria-activedescendant`, `aria-selected`,
`role="group"`) uygular; yukarı/aşağı ok, Home/End ve Enter desteklenir, sonuç
sayısı `aria-live` ile duyurulur. Kullanıcı sayfadaki bir metin alanında,
textarea'da veya contenteditable içinde yazarken kısayol devre dışı kalır;
böylece form kullanımı bozulmaz.

Geliştirme sürecinde iki erişilebilirlik hatası bulunmuş ve düzeltilmiştir:
(1) Mobil menü açıkken klavye odağı DOM sırası nedeniyle bağlantıları atlıyordu;
DOM sırası "menü düğmesi → bağlantılar → arama" olarak düzeltildi ve Escape
menüyü kapatıp odağı düğmeye geri verecek şekilde genişletildi. (2) React
StrictMode'un geliştirme ortamındaki mount → unmount → mount döngüsünde
`dialog.close()` tarafından asenkron kuyruğa alınan `close` olayı, yeniden açılan
diyaloğu kapatıyordu; `close` olayı artık yalnız diyalog gerçekten kapalıysa
işlenir.

### Terminal Easter Egg

Terminal ana navigasyonun parçası değildir; komut paletindeki "Terminali aç"
komutu ve header'daki yardımcı "Terminal" düğmesi ile açılan bir geliştirici
easter egg'idir. Desteklenen komutlar: `help`, `about`, `projects`, `skills`,
`blog`, `cv`, `contact`, `github`, `clear`. Bilinmeyen komut sade bir
"Komut bulunamadı" yanıtı üretir. Arayüz JetBrains Mono ile, emoji, ASCII art ve
neon yeşil kullanılmadan mevcut koyu tema token'larıyla tasarlanmıştır. Girdi
gerçek bir HTML `input` alanıdır; komut geçmişi yukarı/aşağı ok ile gezilir ve
yalnız bellekte tutulur (localStorage, cookie veya veritabanına yazılmaz; tarayıcı
testinde depolama anahtarı sayısı 0 olarak doğrulanmıştır). Çıktı `role="log"`
ile ekran okuyuculara duyurulur, `clear` sonrası "Ekran temizlendi" durumu
bildirilir.

Terminal gerçek bir shell değildir. Girdi yalnız sabit bir komut
registry'sinde (`terminalCommands`) anahtar olarak aranır; `Object.hasOwn`
kontrolü sayesinde `constructor`, `__proto__` gibi prototip anahtarları komut
sayılmaz. `eval`, `Function`, işletim sistemi komutu, dosya sistemi, ağ isteği
veya veritabanı erişimi yoktur. Çıktı düz metin ve allowlist'ten geçmiş
bağlantılardan oluşan React elemanlarıdır; HTML string render edilmez.

### GitHub Public API Integration ve Public Developer Profile Integration

Landing sayfasına, kariyer zaman çizgisinden sonra sade bir GitHub bölümü
eklenmiştir. Kullanıcı adı önce görünür `social_links` kaydındaki
`https://github.com/<kullanıcı>` URL'sinden, yoksa server-only `GITHUB_USERNAME`
değişkeninden türetilir; kaynak koda sabit bir kullanıcı adı yazılmamış ve yeni
veritabanı alanı eklenmemiştir. Veri, GitHub REST API'nin public uç noktalarından
(`GET /users/{username}` ve `GET /users/{username}/repos`) yalnız sunucu
tarafında alınır; tarayıcı GitHub API'sine istek atmaz. Gösterilen bilgiler
kullanıcı adı, public repository sayısı ve fork/arşiv olmayan, son push tarihine
göre sıralı en fazla altı public repository'dir (ad, açıklama, birincil dil,
son push tarihi). Uydurma "en iyi repo" sıralaması, follower/yıldız vitrini veya
güvenilir biçimde hesaplanamayan toplu dil istatistiği gösterilmemiştir.

Uygulama öncesinde güncel GitHub dokümantasyonu incelenmiş; kimlik doğrulamasız
isteklerde birincil sınırın IP başına saatte 60 istek, kişisel token ile saatte
5.000 istek olduğu, `/users/{username}/repos` uç noktasının yalnız public
repository döndürdüğü ve güncel `X-GitHub-Api-Version` değerinin `2026-03-10`
olduğu doğrulanmıştır. 60 değeri canlı `x-ratelimit-limit` response header'ı ile
de gözlenmiştir. OAuth eklenmemiştir; opsiyonel `GITHUB_TOKEN` yalnız rate limit'i
yükseltmek içindir ve client'a hiç gönderilmez.

API yanıtı güvenilir kabul edilmez: Zod şemaları yalnız UI'nin kullandığı
alanları okur, `html_url` değerinin `https://github.com` olmasını zorunlu kılar
ve sonuç dar `GitHubProfileDTO`'ya dönüştürülür. İstek 4 saniyelik
`AbortSignal.timeout` ile sınırlandırılmıştır. Sonuç `unstable_cache` ile altı
saat cache'lenir; başarısızlık cache'e yazılmaz, aynı sunucu örneğinde on
dakikalık bir hata bekleme süresi GitHub kesintisinde her isteğin zaman aşımını
beklemesini engeller. API başarısız olursa landing çökmez; bölüm yalnız profil
bağlantısıyla render edilir. Bu davranış var olmayan bir kullanıcı adıyla gerçek
404 yanıtı alınarak test edilmiştir.

Admin panelinde repository'si private olarak işaretlenen projelerin URL'leri
sunucu tarafında okunur ve GitHub listesinden çıkarılır; bu URL'ler hiçbir
zaman client'a gönderilmez. Böylece CMS'de gizli tutulmak istenen bir repository,
GitHub'da public olsa bile landing'de listelenmez. Proje detayındaki Phase 2
private repository davranışı değişmemiştir.

### Project Case Study Presentation

Proje detay sayfası vaka çalışması düzenine getirilmiştir. Hero bölümünde rol,
okunabilir Türkçe tarih, durum (renkli durum noktası ile) ve teknoloji etiketleri
bir meta şeridinde; canlı proje bağlantısı birincil düğme, public kaynak kod
ikincil düğme, private repository ise kesik çerçeveli "Private repository"
rozeti olarak gösterilir. İçerikte "Bu sayfada" bölüm navigasyonu yalnız gerçekten
dolu bölümler için üretilir (`buildCaseSections`); iki bölümden az içerik varsa
navigasyon hiç render edilmez. Geniş ekranda navigasyon yapışkan (sticky) kenar
çubuğudur; Problem ve Çözüm yan yana iki sütunda sunulur.

Veritabanında mimari için yalnız `architectureDescription` metin alanı
bulunduğundan migration yapılmamış ve uydurma "Frontend → API → Database"
diyagramı çizilmemiştir. Bunun yerine `parseTechnicalText` metni boş satırlardan
paragraflara, `-`, `*`, `•` veya `1.` ile başlayan satırları erişilebilir
listelere dönüştürür; mimari notlar vurgulu bir teknik panelde, projenin gerçek
skill ilişkilerinden gelen "İlişkili teknolojiler" etiketleriyle birlikte
sunulur. Çıktı React metin düğümleridir; `<script>` içeren bir mimari metnin
kaçışlanmış metin olarak göründüğü HTTP testinde doğrulanmıştır. Yapısal mimari
editörü gelecek çalışma olarak bırakılmıştır.

Galeri mevcut ızgara ile çalışmaya devam eder; her görsel gerçek bir `button`
olarak erişilebilir lightbox açar. Lightbox'ta sol/sağ ok ile gezinme, Escape ile
kapanma, odak geri dönüşü ve `aria-live` açıklama bulunur. Slider/carousel
bağımlılığı eklenmemiştir.

### Navigation, Footer ve Contact Polish

Mobil görünümde daha önce ana navigasyon tamamen gizleniyordu. Phase 7'de
`aria-expanded`/`aria-controls` kullanan bir menü düğmesi eklenmiş, menü rota
değişince kendiliğinden kapanır. Aktif rota `aria-current="page"` ve ince bir alt
çizgi ile gösterilir; landing anchor'ları için scroll spy yapılmamıştır. Blog
navigasyonu `/#blog` anchor'ı yerine gerçek `/blog` rotasına yönlendirilmiştir.
Komut paleti navigasyonun alternatifidir; yerine geçmez.

Header/footer root layout'tan `(public)/layout.tsx` ve `admin/layout.tsx`
dosyalarına taşınmıştır. Public footer ad, projeler, blog, CV, görünür sosyal
bağlantılar, GitHub ve dinamik yılı içerir; Terminal header'a taşınmıştır. Admin ve eşleşmeyen
URL 404 sayfası, Phase 0–6'daki sade footer'ı korur. İletişim bölümü yalnız
e-posta/bağlantı listesi olarak sadeleştirilmiş, kanal türü etiketleri ve
erişilebilir "yeni sekmede açılır" metinleri eklenmiştir; e-posta gönderim
backend'i eklenmemiştir.

### Accessibility Improvements ve UX Polish

Yeni diyaloglar `prefers-reduced-motion` altında animasyonsuz açılır. Diyaloglar
kısa viewport'larda (yaklaşık %200 zoom eşdeğeri 640×400) ekran içinde kalacak
biçimde yükseklik sınırlarıyla düzenlenmiştir; bu sorun test sırasında bulunup
düzeltilmiştir. Harici bağlantılar `target="_blank"` ile birlikte
`rel="noopener noreferrer"` ve ekran okuyucu için "yeni sekmede açılır" metni
taşır. Tasarım dili (0 radius, 1 px border, token renkleri, JetBrains Mono
etiketleri) korunmuştur.

Bir diyalog açıkken Hero ve Skill Universe render loop'ları yeni frame
istemez; renderer yeniden oluşturulmaz ve diyalog kapanınca aynı loop devam eder.
Bu, `data-overlay` bayrağı ve `site-overlay-change` olayı ile sağlanır.

### Phase 7 Doğrulama Sonucu

Lint, TypeScript ve production build başarılıdır; `/admin/login` statik kalmıştır.
Toplam 60 unit/security testi geçmiştir (11'i Phase 7). Geçici local libSQL
veritabanında Phase 2 (9), Phase 3 (12), Phase 4 (18), Phase 5 (7) ve Phase 7 (8)
HTTP testleri geçmiştir. Phase 7 HTTP testi gerçek GitHub API'sine yapılan
salt-okunur istekleri içerir; test hesabı olarak GitHub'ın resmî demo hesabı
`octocat` kullanılmıştır. Production build çıktısında palet ve terminal ayrı lazy
chunk'lardadır, `/admin/login`'in yüklediği script'lerde bulunmaz ve client
chunk'larında `GITHUB_TOKEN`/`api.github.com` geçmez. `npm audit` 0 vulnerability
bildirmiştir. Gerçek fiziksel cihaz/ekran okuyucu testi ve frame bazlı GPU ölçümü
yapılmamıştır (bkz. TEST_LOG).

## 25. Phase 8 — Sosyal Bağlantı Yönetimi ve Production Hazırlığı

Phase 8'in hedefi, local ortamda test edilmiş sistemi Vercel, Turso ve
Cloudflare R2 üzerinde internete çıkarmak ve canlı ortamda doğrulamaktı. Faz
başında local kalite çizgisi (lint, build, 60 unit test, Phase 2–7 HTTP testleri,
npm audit) yeniden doğrulanmış ve regresyon bulunmamıştır. Ardından eksik kalan
tek CMS modülü olan sosyal bağlantı yönetimi tamamlanmıştır.

Bulut aşamasına geçmeden önce proje sahibinden alınan kararla sitenin public'e
çıkarılmamasına, uzak repository oluşturulmamasına ve çalışmanın yalnız yerel
bilgisayarda tutulmasına karar verilmiştir. Bu nedenle Vercel projesi
oluşturulmamış, deploy yapılmamış, Turso veritabanı ve R2 bucket
oluşturulmamış, production admin hesabı açılmamış ve production smoke testleri
çalıştırılmamıştır. Aşağıdaki "Production" başlıkları gerçekleştirilen hazırlığı
ve local doğrulamaları anlatır; canlı ortam sonuçları raporlanmamıştır, çünkü
böyle bir ortam yoktur.

### Sosyal Bağlantı Yönetimi (Social Links CMS)

`/admin/social` ekranı ile yönetici sosyal bağlantı ekleyebilir, düzenleyebilir,
silebilir, görünür/gizli yapabilir ve sırasını yukarı/aşağı değiştirebilir.
Mevcut `social_links` şeması (platform, label, url, displayOrder, isVisible)
yeterli olduğundan migration üretilmemiştir. Tüm mutation route'ları
(`/api/admin/social-links`, `/[id]`, `/[id]/move`) mevcut `requireAdminApi()`
fonksiyonunu kullanır; bu fonksiyon hem Phase 5 exact-origin / Fetch Metadata
kontrolünü hem de admin rol kontrolünü uygular. Platform değeri sabit bir listeden
seçilir (GitHub, LinkedIn, X, GitLab, Stack Overflow, Medium, YouTube, Web sitesi,
Diğer); ikon/HTML sistemi eklenmemiştir. Sosyal bağlantılar zorunlu bir profil
yabancı anahtarına bağlı olduğundan profil yoksa ekleme yerine açıklayıcı bir
mesaj gösterilir.

Phase 7'de bulunan `javascript:` bulgusunun yönetim arayüzünden yeniden
üretilememesi için URL sunucu tarafında `normalizeSocialUrl` ile ayrıştırılır;
yalnız kimlik bilgisi içermeyen `https:` adresleri kabul edilir. `javascript:`,
`data:`, `vbscript:`, `http:`, `mailto:`, kontrol karakteri gizlenmiş
(`java\tscript:`) ve göreli adresler reddedilir. E-posta iletişimi profildeki
ayrı e-posta alanı ve görünürlük anahtarıyla yönetilmeye devam eder. GitHub
platformu seçildiğinde adresin `https://github.com/<kullanıcı-adı>` biçiminde
olması zorunludur; böylece landing GitHub bölümü doğrudan admin'den girilen
bağlantıyla beslenir (`GITHUB_USERNAME` yalnız yedek olarak kalır). Bu davranış
hem HTTP testinde hem tarayıcıda gerçek arayüzle doğrulanmıştır.

### Production Deployment (hazırlık)

Kurulu Vercel CLI 59.15.1 ve açık hesap oturumu doğrulanmış; `vercel env run`
komutunun secret'ları diske yazmadan komutlara enjekte edebildiği tespit
edilmiştir. `docs/DEPLOYMENT.md` bu altyapıya göre adım adım, secret içermeyen
bir rehbere dönüştürülmüştür. Rehberdeki Vercel komutlarının (link, deploy,
inspect --logs, logs, rollback, promote, env run) kurulu CLI'da mevcut olduğu
kontrol edilmiştir.

### Cloud Database ve Object Storage (planlanan yapı)

Turso'nun güncel resmî dokümanı incelenmiş; salt-okunur token
(`turso db tokens create <db> --read-only`) ve plana bağlı point-in-time
recovery pencereleri (Free 24 saat, Developer 10 gün, Scaler 30 gün, Pro 90 gün)
doğrulanmıştır. Preview ortamı için production veritabanına salt-okunur token
verilmesi kararlaştırılmıştır. Cloudflare dokümanına göre `r2.dev` public
geliştirme adresinin rate-limited ve development amaçlı olduğu doğrulanmış;
proje sahibi custom domain yerine geçici `r2.dev` adresini tercih ettiğinden bu
yol "production final çözümü değildir" notuyla belgelenmiştir. CORS politikası
yalnız production origin'i (ve isteğe bağlı localhost), PUT methodunu ve
Content-Type header'ını izinli tutacak biçimde tasarlanmıştır.

### Production Authentication ve HTTPS Security (planlanan)

Better Auth yalnız `BETTER_AUTH_URL` origin'ine güvenir. Preview deployment'larda
admin girişi bilinçli olarak desteklenmez: Preview'a production canonical origin
verilir, farklı bir auth secret ve salt-okunur veritabanı token'ı kullanılır. Bu
nedenle wildcard `*.vercel.app` güvenilir origin eklenmemiştir. HTTPS cookie
attribute'larının (Secure, HttpOnly, SameSite=Lax, Path, expiry) canlı yanıtta
doğrulanması için gizli prompt kullanan bir smoke betiği hazırlanmıştır; canlı
ortam olmadığı için Secure bayrağı bu fazda da doğrulanamamıştır.

### Deployment Testing ve Production Smoke Testing (hazırlanan araçlar)

Üç yıkıcı olmayan betik eklenmiştir: `tests/phase8-production-smoke.mjs`
(route, header, 404, PDF, GitHub, secret leak, isteğe bağlı admin ve rate-limit),
`tests/phase8-turso-smoke.mjs` (salt-okunur veritabanı kontrolleri) ve
`tests/phase8-r2-smoke.mjs` (veritabanına satır yazmadan presign → CORS →
PUT → HEAD → magic-byte → public GET → `next/image` → silme). Secret değerleri
yalnız eşleşme sayısı olarak raporlanır. Betiklerin sözdizimi doğrulanmış, ancak
hedef ortam olmadığından çalıştırılmamıştır.

Bulut hata modları local production build üzerinde ölçülmüştür: erişilemeyen bir
libSQL adresiyle public sayfalar genel 500 sayfası, PDF generic JSON 500 döndürmüş;
yanıtlarda veritabanı adresi, sağlayıcı adı veya stack izi bulunmamış, server
log'unda dummy token/secret değeri geçmemiştir. Statik `/admin/login` 200,
oturumsuz admin mutation 401 kalmıştır.

### Production Performance Validation

Canlı ortam olmadığı için Lighthouse/PageSpeed ölçümü, lab Core Web Vitals
değerleri ve gerçek kullanıcı (field) verisi raporlanmamıştır.

### Phase 8 Doğrulama Sonucu

Lint, TypeScript ve production build başarılıdır. Unit/security testleri 63/63
(Phase 8'e özgü 3), güvenlik unit testleri 6/6 geçmiştir. Geçici local libSQL
veritabanında Phase 2 (9), Phase 3 (12), Phase 4 (18), Phase 5 (7), Phase 7 (8)
ve yeni Phase 8 sosyal bağlantı (10) HTTP testleri geçmiştir. `npm audit`
0 vulnerability bildirmiştir. Bu makinede NVDA kurulu olmadığı ve fiziksel mobil
cihaz bulunmadığı için gerçek ekran okuyucu ve cihaz testleri beklemededir.
Tarayıcı aracı `prefers-reduced-motion` emülasyonu sunmadığından reduced-motion
runtime testi de beklemededir.
