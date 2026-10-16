# Teknik Kararlar

## 1.9.0 — Yüklenen profesyonel CV birincil public CV (2026-10-15)

### ADR-095 — Yönetici tarafından yüklenen profesyonel PDF birincil CV'dir; üretilen PDF yedektir

- **Tarih:** 15 Ekim 2026
- **Durum:** Uygulandı, 1.9.0. ADR-094 (üretilen PDF sayfalaması) geçerliliğini korur; üretilen PDF artık yedek rolündedir.
- **Bağlam:** 1.8.4'te yapılandırılmış veriden (`PublicCvData`) Web CV, `@react-pdf/renderer` ile üretilen ATS odaklı PDF ve ATS kontrolü çalışıyordu. Teknik olarak doğru olan bu PDF, sahibin ayrıca hazırladığı profesyonel tasarımlı CV kadar iyi görünmüyordu. Ziyaretçinin "CV" tıklamasında görmesi gereken belge bu profesyonel PDF'tir.
- **Karar:**
  - Yönetici, admin CV sayfasındaki "Profesyonel CV PDF" bölümünden bir PDF yükler/değiştirir/kaldırır. Bu PDF **birincil public CV**'dir.
  - Public uç nokta değişmedi: `GET /api/cv/pdf`. Aktif yükleme varsa onu, yoksa (veya depolama okunamazsa) üretilen PDF'i sunar. `?download=1` → `attachment`, varsayılan → `inline`.
  - PDF sunucu tarafında R2'den okunup **aynı origin** üzerinden teslim edilir; ham R2/`r2.dev` URL'si veya imzalı URL public'e verilmez (Türk Telekom `r2.dev` TLS sorunu, ADR-092).
  - Yükleme mevcut güvenli görsel akışını izler: admin → presign → tam anahtarlı imzalı PUT → finalize (HEAD: MIME + boyut + bilet eşleşmesi; Range GET: `%PDF-` imzası) → atomik DB geçişi → eski nesnenin best-effort silinmesi.
  - Depolama: değiştirilemez `cv/<uuid>.pdf` anahtarları. Meta veri `cv_settings` tekil satırındaki dört nullable kolonda (`uploaded_pdf_key`, `uploaded_pdf_original_name`, `uploaded_pdf_size`, `uploaded_pdf_uploaded_at`); eklemeli migration `20261015154218_phase19_uploaded_cv_pdf`.
  - Yükleme bileti görsel biletinden ayrı bir şema ve alan-ayrımlı HMAC girdisi (`cv-upload:`) kullanır; biri diğerinin yerine kullanılamaz. Görsel yükleme doğrulaması değiştirilmedi.
  - Yapılandırılmış CV sistemi (profil, eğitim, deneyim, yetenek, sertifika, CV ayarları, `/cv` Web CV, üretilen PDF, ATS kontrolü) silinmedi.
- **Neden:**
  - Yapılandırılmış veri web sunumu ve Web CV için hâlâ değerlidir.
  - Üretilen PDF, yükleme yokken veya depolama erişilemezken CV bağlantısının kırılmamasını sağlar (dayanıklılık).
  - Profesyonel tasarımlı, kullanıcının hazırladığı PDF daha iyi sunum kalitesi verir.
  - Depolama yalnız yöneticinin kontrolündedir; public bağlantı (`/api/cv/pdf`) sabit kalır, mevcut linkler kırılmaz.
- **Reddedilen:** (a) Kişisel PDF'i `public/` altına koymak — kaynak kontrolüne kişisel dosya girer, değiştirmek deploy gerektirir. (b) Sabit tek anahtar (`cv/active.pdf`) üzerine yazmak — başarısız yükleme aktif CV'yi bozabilir, önbellek tutarsızlığı. (c) Ziyaretçiyi doğrudan R2 public URL'sine yönlendirmek — `r2.dev` erişim sorunu ve depolama ayrıntısı sızar. (d) Yapılandırılmış CV'yi kaldırmak — Web CV ve yedek kaybolur.
- **Sonuç:** Navbar, hero, CV paneli, İletişim, komut paleti ve terminal "CV"si `/api/cv/pdf`'i yeni sekmede açar; `/cv` Web CV olarak kalır. Başarısız yükleme aktif CV'yi değiştirmez; silme hatası aktif CV'yi etkilemez. Testler yerel S3 uyumlu mock ile tam akışı doğrular (`npm run test:cv:http`).
- **Sınırlama:** Mock imza doğrulamaz; gerçek R2 imza/süre davranışı `tests/phase8-r2-smoke.mjs` ile ayrıca kapsanır. Gerçek profesyonel PDF kullanıcı tarafından admin panelinden yüklenmiş ve public uç noktada `uploaded` kaynağıyla doğrulanmıştır.

## 1.8.4 — PDF CV sayfalama (2026-10-10)

### ADR-094 — PDF CV sayfalama: düz bloklar, keep-together ve yalnız `marginTop`

- **Tarih:** 10 Ekim 2026
- **Durum:** Uygulandı, 1.8.4
- **Bağlam:** `@react-pdf/layout` 5.x legacy paginator'ı sığan bir bloğun `marginBottom`'ını da presence hesabına katar; `minPresenceAhead` ve "break" kararları yalnız aynı kapsayıcıdaki önceki kardeşler varken çalışır. Her bölüm tek bir `View` içinde olduğundan sığan Sertifikalar bölümü bütünüyle sonraki sayfaya itildi, deneyim açıklaması ise öğesinden ayrılıp tek başına yeni sayfaya düştü.
- **Karar:** Bölümler sayfa düzeyinde düz bloklar olarak üretilir. Başlık + ilk öğe tek `wrap={false}` bloktur (yetim başlık yok); sonraki her öğe ayrı `wrap={false}` bloktur (bölüm öğe öğe akabilir). Dikey boşluk yalnız `marginTop` ile verilir. 600 karakteri aşan açıklamalarda yalnız başlık/kurum/tarih bloğu bir arada tutulur ve `minPresenceAhead` ile en az iki satır açıklama taşır; böylece çok uzun bir öğe sayfa sonunda büyük boşluk bırakmaz.
- **Sonuç:** Mevcut veriyle PDF 3 sayfadan 2 sayfaya indi (sayfa 1: başlık, Eğitim, 8 sertifika, Projeler; sayfa 2: Yetenekler, Deneyim). Font boyutları, Noto Sans, tek kolon ATS yapısı ve linkler değişmedi. `tests/phase18-http.mjs` sayfalama regresyonu eski kodda başarısız, yeni kodda başarılıdır; tam HTTP 130/130.
- **Reddedilen:** Fontu küçültmek, bölümleri tümden `wrap={false}` yapmak (uzun bölümde büyük boşluk), deneysel `experimentalPagination` motoru (opt-in, kararlılığı doğrulanmadı).

## 1.8.3 — Development medya teslimi ve bağımlılık bakımı (2026-10-10)

### ADR-092 — `r2.dev` için yalnız development aynı-origin medya uç noktası

- **Tarih:** Ekim 2026
- **Durum:** Uygulandı, 1.8.3
- **Bağlam:** Gerçek R2 bucket yapılandırıldıktan sonra Türk Telekom bağlantısında `*.r2.dev` görselleri yüklenmedi. TLS bağlantısına ağ üzerindeki bir ara cihazın müdahale ettiği ve TLS yerine HTTP yönlendirmesi döndüğü kanıtlandı. Uygulama, R2 bucket, CORS ve CSP kök neden olarak elendi.
- **Karar:** `GET /api/media/r2` yalnız `NODE_ENV=development` iken çalışır. `imageDeliveryUrl()` yalnız development'ta ve yalnız `https://*.r2.dev` kaynaklarını bu uç noktaya çevirir. Production'da uç nokta 404 döner; CSP, HSTS ve doğrudan R2 teslimi değişmez.
- **Güvenlik sınırı:** Origin birebir `R2_PUBLIC_BASE_URL`, anahtar `projects|blog/<uuid>/<uuid>.(jpg|png|webp)`, içerik türü JPEG/PNG/WebP allowlist'i, yanıt `no-store` + `nosniff`. Bu nedenle açık proxy veya SSRF yüzeyi oluşturmaz.
- **Alternatifler:** Production davranışını proxy'ye çevirmek (gereksiz sunucu yükü ve ölçek maliyeti), CSP'yi gevşetmek (kök neden değildi) veya ağ sorununu görmezden gelmek (development'ta medya doğrulanamazdı) reddedildi.

### ADR-093 — Dev-only audit bulgusu için zorla düşürme yapılmaz

- **Karar:** Next.js 16.3.8, sharp 0.35.5 ve source-map-js 1.2.2'ye yükseltildi. Production denetimi (`npm audit --omit=dev`) 0 bulgu verir. Lint zincirindeki `braces` uyarısı için önerilen `npm audit fix --force` `eslint-config-next`'i 14.x'e düşürdüğünden uygulanmadı; uyumlu upstream sürüm çıktığında güncellenecektir.

## 1.8.0 Phase 18 — Sertifika ve yerel migration kararları (2026-09-30)

- Sertifikalar için ayrı, eklemeli tablo seçildi; mevcut profil/proje/CV tabloları değiştirilmedi. Boş isteğe bağlı metinler `NULL` saklanır ve public arayüzde yer tutucu üretmez.
- `isVisible` ve `showInCv` ayrı tutuldu. Landing ilk bayrağa; web/PDF CV iki bayrağın kesişimine dayanır. Filtre sunucu SQL sorgusundadır.
- Doğrulama URL'si yalnız kimlik bilgisi içermeyen HTTPS bağlantısı olabilir. Girişte ve public DTO hazırlanırken yeniden denetlenir; dış bağlantıda `noopener noreferrer` kullanılır.
- Landing'deki en fazla dört sertifika mevcut sıralı Data Spine davranışını paylaşır. Contact için yalnız yatay boşluk ayarı yapıldı.
- Yerel Drizzle CLI `.env.local` ve `.env` okur; açıkça sağlanan ortam değişkenleri önceliklidir. Boş local token, `file:` URL için sahte cloud token gerektirmez. Final doğrulama bitmeden sürüm kararı verilmez.

## 1.7.0 - Native pin ve erişilebilir fallback (2026-09-27)

- Wheel preventDefault/snap yok; gerçek document scroll mesafesi ve CSS sticky seçildi. Pin görsel sabitliktir, scrollTop kilidi değildir.
- Item sayısı yalnız gerçek landing marker'larından gelir; GitHub public API toplam repo sayısı kullanılmaz. Section önem ağırlığı (Journey 1.2, Contact .65, diğerleri 1), viewport ve mobile step katsayısı tek pure budget fonksiyonunda tutulur.
- Scene viewport'a sığmazsa pin disable edilir; içerik küçültülüp saklanmaz, normal akış/tüm görünür targets kullanılır. Mobile kompakt spacing, kısa branch ve daha kısa mesafe kullanır. Reduced-motion extra scroll kaldırır.
- Core pin başlangıcında hub merkezine yerleşir ve reverse boyunca kalır. Branch draw tamamlanmaya yaklaşınca item açılır, önceki item kaybolmaz. Son %12 release runway'dir.
- Sticky SVG geometry ve core birlikte taşınır; sample buffer cache edilir. Pin için yeni Three/canvas eklenmez, mevcut WebGL enhancement pin sırasında SVG'ye yer verir.
- Eski Phase 13 `spine-scene` adı eski canvas marker'ını yasaklıyordu; yeni DOM sözleşmesi `data-pin-scene` ile anlam ayrıldı, eski test silinmedi/zayıflatılmadı.
- Browser'da yakalanan CSS specificity ve sticky yeniden ölçüm hataları düzeltildi. İlk hash enhancement sonrası bir kez hizalanır. Gerçek OS/Safari/touch/zoom/FPS doğrulaması yapılmış sayılmaz.

## 1.6.0 — Hub arrival ve sıralı vurgulama (2026-09-27)

- Branch kökeni hedefin yüksekliğindeki spine noktası değil gerçek local hub koordinatıdır. Mobilde de aynı köken korunur; yatay spread daraltılır.
- Core hub'a ulaşınca sequence boyunca park eder. Section-local scroll penceresi son item ve sonraki hub ile sınırlıdır; ayrı timer kullanılmaz.
- Önce branch çizilir, ardından item vurgu alır. Pasif içerik minimum %58 opacity ile okunabilir ve tıklanabilir; hover/focus tam okunabilirlik sağlar. Reduced-motion tüm item'ları tam okunabilir tutar.
- Timeline'ın ayrı Anime scroll clock'u ve landing kartlarının bağımsız reveal'i kaldırıldı; aynı spine rAF'ı tek otorite olur. Standalone kartlar eski reveal/motif davranışını korur.
- Arrival latch restored/deep-link/resize ve hızlı scroll crossing'i destekler. Effect kapandıktan sonra measure/rAF/font callbacks iş yapmaz; detached SVG state problemi önlenir.
- Sürüm otomatik kapılar ve browser kontrolünden sonra 1.6.0 yapıldı. OS emülasyonu/hover matrisi/FPS/print preview kapsam dışı doğrulama borcu olarak açıkça tutulur.

## 1.1.0 — Güncel UX ve CV davranışı (2026-09-26)

`shortBio` yalnız landing Hero'da; `longBio` Hakkımda'da kullanılır. CV özeti override → longBio → bölüm yok sırasını izler. Eğitim programı opsiyoneldir; boş/dash-only içerik render edilmez, eski kayıt değiştirilmez. Timeline yalnız eğitim ve deneyimdir; projeler showcase içinde kalır.

Profile `phone` / `isPhoneVisible` ve Social Links `showInCv` additive migration ile eklendi. Telefon güvenli `tel:` normalizasyonu ve görünürlük filtresiyle Contact/web CV/PDF'e ulaşır. CV ve CV shell yalnız `isVisible && showInCv` linklerini alır. GitHub/LinkedIn/Website CV varsayılanı true, diğerleri false; admin değiştirebilir. Instagram, Behance, Dribbble dahil platformlar desteklenir.

PDF artık yerel OFL lisanslı Noto Sans Regular/Bold TTF kullanır; Helvetica kararı bu sürümde geçersiz kılınmıştır. Tek kolon/selectable metin korunur. Terminal header yardımcı kontrolüne taşındı; footer bio/admin/version tekrarlarından arındırıldı. Landing arka planı fixed üç katman, rAF/CSS variables ve section IntersectionObserver kullanır; reduced-motion statiktir. Mevcut Three/Anime sistemleri korunur. FPS/ATS-vendor kabulü iddiası yoktur.

Güncel doğrulama ve sınırlamalar: [UX phase raporu](UX_PHASE_REPORT.md). Önceki phase test sayıları ve kararları tarihsel kayıttır.


## ADR-001 — Next.js App Router ile başlangıç

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Uygulama Next.js 16 App Router, React 19 ve `src` dizini ile kuruldu.
- **Neden:** Server Component yaklaşımı, dosya tabanlı route sistemi, metadata
  desteği ve Vercel dağıtımı proje gereksinimleriyle doğrudan uyumludur.
- **Alternatifler:** Pages Router; ayrı React SPA ve API servisi.
- **Avantajlar:** Daha az istemci JavaScript'i, tek kod tabanı, route düzeyinde
  düzen ve metadata yönetimi.
- **Dezavantajlar:** Framework sürüm geçişlerinde kırıcı değişiklik riski ve
  Next.js'e özgü çalışma modeli.

## ADR-002 — Strict TypeScript ve sunucu öncelikli bileşenler

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** TypeScript `strict` modu korunacak; etkileşim gerektirmeyen kod
  Server Component olarak kalacaktır.
- **Neden:** Veri sözleşmelerindeki hataları erken yakalamak ve gereksiz istemci
  paketini azaltmak.
- **Alternatifler:** JavaScript; geniş kapsamlı Client Component kullanımı.
- **Avantajlar:** Daha güvenli refactoring, daha küçük istemci çıktısı.
- **Dezavantajlar:** İlk geliştirme sırasında daha fazla tip tanımı gerektirir.

## ADR-003 — Tailwind CSS 4 ve merkezi tasarım token'ları

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Tailwind CSS 4 temel stil sistemi olarak kullanılacak; renk ve font
  değerleri global semantik token'larla yönetilecektir.
- **Neden:** Hızlı, tutarlı ve responsive arayüz geliştirmek.
- **Alternatifler:** CSS Modules; styled-components; hazır bileşen kütüphanesi.
- **Avantajlar:** Düşük çalışma zamanı maliyeti ve tasarım tutarlılığı.
- **Dezavantajlar:** Uzun class listeleri oluşabilir; Phase 0'daki özel global
  sınıflar ileride bileşen büyüdükçe CSS Module'a ayrılabilir.

## ADR-004 — Bağımlılıkların fazlara göre eklenmesi

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Turso, Drizzle, Better Auth, Tiptap, R2 istemcisi, Anime.js,
  Three.js ve PDF paketi Phase 0'da yüklenmedi.
- **Neden:** Kullanılmayan kodu ve belirsiz yapılandırmayı temele taşımamak.
- **Alternatifler:** Bütün teknoloji yığınını ilk kurulumda yüklemek.
- **Avantajlar:** Daha küçük bağımlılık yüzeyi, daha hızlı denetim ve daha düşük
  tedarik zinciri riski.
- **Dezavantajlar:** Sonraki fazlarda ek kurulum adımları gerekir.

## ADR-005 — Turso/libSQL veri katmanı

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Dinamik içerik ve auth verisi için Turso/libSQL bağlantı altyapısı
  kuruldu.
- **Neden:** Kişisel, tek yöneticili uygulama için operasyonu hafif bir SQL
  altyapısı ve açık şema yönetimi sunması.
- **Alternatifler:** Supabase/PostgreSQL; doğrudan libSQL sorguları; Prisma.
- **Avantajlar:** Dağıtık SQLite uyumu, düşük operasyon yükü, SQL'e yakın ve tip
  güvenli sorgular.
- **Dezavantajlar:** PostgreSQL ekosistemine göre daha sınırlı ileri seviye veri
  tabanı özellikleri bulunur. Supabase/PostgreSQL, bu tek adminli kişisel proje
  için ihtiyaç dışı servis ve operasyon kapsamı getireceği için seçilmedi.

## ADR-006 — Cloudflare R2 medya depolama

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı; 1.8.3'te gerçek bucket ile yerelde uçtan uca doğrulandı
- **Karar:** Merkezi `media` metadata tablosu ve server-only AWS SDK v3 R2
  istemcisi kullanılır. Binary R2'de, metadata ve ilişkiler database'dedir.
- **Neden:** Binary veriyi veri tabanından ayırmak ve nesne depolama modelini
  kullanmak.
- **Alternatifler:** Vercel Blob; S3; görselleri veri tabanında saklamak.
- **Avantajlar:** S3 uyumlu API ve medya/veri sorumluluklarının ayrılması.
- **Dezavantajlar:** İmzalı yükleme, MIME doğrulama ve yaşam döngüsü yönetimi
  ayrıca uygulanmıştır; bucket CORS/deployment doğrulaması dış operasyondur.

## ADR-007 — Drizzle ORM ve versioned migration

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Drizzle ORM 1.0 RC ve Drizzle Kit kullanılarak Git'e dahil edilen SQL
  migration akışı kuruldu.
- **Neden:** SQLite/libSQL tip güvenliği, okunabilir SQL çıktısı ve şema ile
  migration arasında izlenebilirlik sağlamak.
- **Alternatifler:** Ham SQL; Prisma; doğrudan `drizzle-kit push`.
- **Avantajlar:** Akademik raporda incelenebilir şema geçmişi, tip güvenli sorgu
  altyapısı ve kontrollü production migration.
- **Dezavantajlar:** RC API'si sürüm yükseltmelerinde uyumluluk kontrolü ister.
  Stable Drizzle Kit'teki bilinen development-server audit bulgusu nedeniyle,
  resmî Turso rehberinin önerdiği ve audit sonucu temiz olan RC kanal seçildi.

## ADR-008 — Skill ve Technology ortak katalogdur

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Ayrı `technologies` tablosu yerine `skills` ve `project_skills`
  junction tablosu kullanıldı.
- **Neden:** Bu projede teknoloji, sahibin teknik becerisi ve projede kullanılan
  araç olarak aynı kavramı temsil eder. Ayrı tablolar tekrar ve eşleme yükü
  oluşturacaktı.
- **Alternatifler:** `technologies` + `project_technologies`; projede JSON/string
  teknoloji listesi.
- **Avantajlar:** Tek katalog, normalize many-to-many ilişki, ortak slug ve
  görünürlük yönetimi.
- **Dezavantajlar:** Teknik olmayan beceriler category ile ayrılmalıdır.

## ADR-009 — CV için tek veri kaynağı

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** CV içerikleri profile, education, experiences, skills ve projects
  tablolarından gelir; `cv_settings` yalnızca CV'ye özgü override, sıra,
  görünürlük, dil ve şablon ayarlarını tutar.
- **Neden:** Site ve PDF CV arasında veri tutarsızlığını önlemek.
- **Alternatifler:** CV için bütün kişisel verileri kopyalayan ayrı tablolar;
  versioned CV snapshot sistemi.
- **Avantajlar:** Tek güncelleme noktası ve daha az veri tekrarı.
- **Dezavantajlar:** Gelecekte tarihsel CV snapshot ihtiyacı doğarsa ayrı bir
  versioning tasarımı gerekir.

## ADR-010 — Singleton ayar kayıtları

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** `profiles`, `cv_settings` ve `site_settings` tablolarında yalnızca
  `primary` id'sine izin veren check constraint kullanıldı.
- **Neden:** Her küçük metin için ayrı tablo oluşturmadan tek sahipli siteyi
  yönetilebilir tutmak.
- **Alternatifler:** Key/value settings tablosu; metinleri kaynak koda gömmek.
- **Avantajlar:** Tip güvenli kolonlar, açık migration ve gerçek singleton
  garantisi.
- **Dezavantajlar:** Yeni ayar eklemek migration gerektirir.

## ADR-011 — Better Auth ve kapalı public registration

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Better Auth email/password, Drizzle Relations v2 adapter ve Admin
  plugin kullanıldı. `disableSignUp: true` ile public signup kapatıldı.
- **Neden:** Güncel Next.js desteği, database session, güvenli parola hashing,
  origin/CSRF kontrolleri ve resmi admin bootstrap akışı sunması.
- **Alternatifler:** Özel session/parola sistemi; Auth.js; public signup sonrası
  rol atama.
- **Avantajlar:** Sahte auth kodu yoktur; session yaşam döngüsü ve credential
  hashing desteklenen kütüphaneye bırakılır.
- **Dezavantajlar:** Auth şeması ve CLI sürümü Better Auth güncellemelerinde
  yeniden üretilip migration olarak incelenmelidir.

## ADR-012 — CLI ile ilk admin bootstrap

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** İlk admin, HTTP endpoint'i yerine Better Auth `create-admin` CLI
  komutuyla oluşturulur; parola terminalde etkileşimli ve gizli alınır.
- **Neden:** Source code, migration veya public signup içinde başlangıç parolası
  bulundurmamak.
- **Alternatifler:** Seed dosyası; gizli signup URL'si; doğrudan SQL insert.
- **Avantajlar:** Better Auth'ın hashing ve database hook akışı korunur, parola
  shell history'ye argüman olarak yazılmaz.
- **Dezavantajlar:** İlk kurulumda yetkili terminal ve doğru production env
  gerektirir.

## ADR-013 — Veritabanı tabanlı auth rate limit

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Better Auth rate limit storage `database` seçildi; email login beş
  istek/dakika ile sınırlandı.
- **Neden:** Vercel gibi çok instance'lı ortamlarda in-memory limit güvenilir
  değildir.
- **Alternatifler:** In-memory limiter; Redis/secondary storage; rate limitsiz
  giriş.
- **Avantajlar:** Instance'lar arasında kalıcı ve paylaşılan sayaç.
- **Dezavantajlar:** Her auth isteğinde database yazımı oluşur; production proxy
  IP header davranışı deployment sırasında ayrıca doğrulanmalıdır.

## ADR-014 — Test edilebilir admin JSON Route Handler'ları

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Project mutasyonları Server Action yerine App Router JSON Route
  Handler'larıdır; her handler merkezi `requireAdminApi()` çağırır.
- **Neden:** Direct R2 upload zaten istemci/server HTTP sınırı gerektirir. CRUD,
  401, validation ve leakage davranışları gerçek HTTP üzerinden test edilebilir.
- **Sonuç:** Endpoint'ler public yüzey olduğundan layout'a güvenilmez; auth ve
  Zod validation her mutasyonda zorunludur.

## ADR-015 — Presigned PUT ve doğrulanmış finalize

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Binary Next.js üzerinden proxy edilmez. Admin 5 dakikalık, tek key
  ve Content-Type'a bağlı PUT URL alır; R2 upload sonrası HMAC bilet ve HEAD ile
  finalize edilir.
- **Neden:** Serverless request boyutu/maliyeti azaltılırken credential server'da
  kalır. Cloudflare'ın resmi S3-compatible presigned URL yaklaşımı izlenir.
- **Sınır:** PUT imzası tek başına içerik uzunluğunu kesin enforce etmez; gerçek
  sınır finalize HEAD sonrası uygulanır. Başarısız finalize object'i siler.

## ADR-016 — Public/admin veri ayrımı

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Admin sorgusu tüm düzenleme alanlarını, public list/detail sorguları
  açık whitelist DTO alanlarını döndürür. Private repository URL'si public detay
  sorgusunda SQL `CASE` ile `NULL` olur.
- **Neden:** Gizli veriyi render katmanında CSS ile saklamak veri sızıntısını
  önlemez; alan server sonucuna hiç girmemelidir.

## ADR-017 — Media ilişkisi ve kontrollü lifecycle

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Project görselleri ortak `media` tablosu üzerinden bağlanır. Cover
  değişimi/proje silme eski R2 object veya media satırını otomatik silmez.
- **Neden:** Aynı medya başka içerikçe kullanılabilir ve geri dönüşü zor storage
  silmeleri referans/retention politikası olmadan güvenli değildir.
- **Sonuç:** Yetim medya cleanup işi ileride referans sayımı ve audit ile yapılır.

## ADR-018 — Basit ve atomik galeri sırası

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Drag-and-drop dependency yerine yukarı/aşağı kontrolleri seçildi.
  Sıra transaction içinde normalize edilir ve komşu kayıtlar swap edilir.
- **Neden:** Klavye erişilebilirliği, hata yüzeyinin küçüklüğü ve tutarlı integer
  `display_order` değerleri bu faz için daha değerlidir.

## ADR-019 — Zod whitelist ve hedefli revalidation

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Client payload yalnız Zod şemasının kabul ettiği alanlardan elle DB
  değerine dönüştürülür. Drizzle sorguları uncached/dinamik kalır; mutasyon sonrası
  `/`, `/projects`, `/admin/projects` ve ilgili detay yolu `revalidatePath` alır.
- **Neden:** Mass assignment engellenir. Next.js 16 Route Handler revalidation
  davranışı izlenir ve tüm site layout cache'i gereksiz yere temizlenmez.

## ADR-020 — Tiptap editör

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Blog içerik editörü olarak `@tiptap/react` + `@tiptap/starter-kit`
  + `@tiptap/extension-link` (3.31.3) kullanıldı; `StarterKit`'in `heading`
  extension'ı `levels: [2, 3]` ile sınırlandı (H1 yalnızca post title'a ait).
  Tablo, YouTube embed, image, raw HTML node gibi ek extension'lar eklenmedi.
- **Neden:** Tiptap, ProseMirror üzerine kurulu, aktif geliştirilen ve JSON
  doküman modeli üreten bir editördür; bu JSON model hem sunucu tarafı
  doğrulamayı hem de allowlist tabanlı render'ı doğal olarak destekler.
  Yalnız gerçekten kullanılan paketler eklendi; deprecated Tiptap v1/v2 API
  örnekleri değil, güncel v3 API'si kullanıldı.

## ADR-021 — Tiptap JSON storage (raw HTML değil)

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** `posts.content` alanı (mevcut `text` kolonu) serialize edilmiş
  Tiptap/ProseMirror JSON doküman ağacı tutar (`JSON.stringify`), editörün
  ürettiği ham HTML değil.
- **Neden:** JSON, yapısal olarak doğrulanabilir (her düğüm/mark tek tek
  allowlist'e karşı kontrol edilebilir); ham HTML string'i doğrulamak için
  ayrı bir HTML parser/sanitizer katmanı gerekirdi. JSON aynı zamanda hem
  editörün "tekrar yükle" akışında hem de public render'da tek kaynaktan
  kullanılabilir. Dezavantajı: şema migration'ında (extension eklenip
  kaldırıldığında) var olan doküman JSON'larının geriye dönük uyumluluğu
  ayrıca düşünülmelidir; bu Phase 3'te tek risk yüzeyi (allowlist) sabit
  tutularak azaltılmıştır.

## ADR-022 — Raw HTML saklanmaz / render edilmez, elle yazılmış allowlist renderer

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Public `/blog/[slug]` sayfası içeriği `dangerouslySetInnerHTML`
  ile değil, `src/features/blog/render-content.tsx` içindeki elle yazılmış
  bir React fonksiyonuyla render eder. Bu fonksiyon, doğrulanmış JSON ağacını
  gezip her düğüm/mark türünü sabit bir React elemanına eşler; allowlist
  dışı bir tür render edilmeden `null` döner.
- **Neden:** Hazır bir "Tiptap static renderer" paketine (örn.
  `@tiptap/static-renderer`) bağımlı olmak yerine, tam kontrol ve minimum
  bağımlılık için özel bir renderer tercih edildi. Bu yaklaşım hem sunucu
  tarafı render performansı sağlar (public kullanıcıya Tiptap/ProseMirror
  JS bundle'ı hiç gönderilmez) hem de XSS riskini formal olarak ortadan
  kaldırır: üretilen çıktı yalnızca sabit kod yolundaki React elemanlarından
  oluşabilir, hiçbir zaman ham string olarak DOM'a enjekte edilmez.

## ADR-023 — Category/tag veri modeli

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Kategori ilişkisi tekil ve opsiyoneldir (`posts.category_id`,
  `onDelete: set null`); etiket ilişkisi çoktan çoğadır (`post_tags`).
  Admin var olan etiketi seçebilir veya post formundaki "yeni etiketler"
  alanına virgülle ayrılmış isim girerek yeni etiket oluşturabilir; yeni
  isimler `toSlug()` ile normalize edilip slug'a göre find-or-create edilir
  (case/aksan farkı aynı slug'a düşüyorsa var olan etiket yeniden kullanılır).
- **Neden:** Şema zaten Phase 1'de bu şekilde tasarlanmıştı ve gereksinimle
  birebir örtüşüyor; değiştirilmedi. Find-or-create + slug normalize,
  duplicate tag ("Next.js" / "next.js" / "NEXT JS") oluşumunu engeller.

## ADR-024 — Validation yaklaşımı

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Blog için ayrı bir validation mimarisi kurulmadı; Project CMS'te
  kanıtlanmış desen (Zod whitelist schema → server-side re-check → elle DB
  value mapping → transaction) aynen tekrarlandı. Ortak parçalar
  (`toSlug`, MIME/size sabitleri, upload-token imzalama) `src/features/media`
  ve `src/server/storage` altına taşınarak iki modül arasında paylaşıldı.
- **Neden:** Tutarlılık ve tekrarın azaltılması; iki farklı CRUD modülünün
  farklı güvenlik varsayımlarına sahip olması riski engellenir.

## ADR-025 — Pagination kararı

- **Tarih:** 23 Eylül 2026
- **Durum:** Pending (bilinçli ertelendi)
- **Karar:** `/blog` bu fazda tüm published yazıları limitsiz döndürür;
  ancak `listPublicPosts({ limit })` zaten opsiyonel bir `limit` parametresi
  kabul eder (landing page bunu `limit: 3` ile kullanır). Klasik
  offset/cursor pagination UI'ı bu fazda eklenmedi.
- **Neden:** Üniversite bitirme projesi ölçeğinde yazı sayısının küçük
  kalması beklenir; asıl CRUD/güvenlik önceliklendirildi. Genişleme noktası
  (`limit`/`cursor` parametresi) veri katmanında zaten mevcut olduğundan
  ileride sayfalama eklemek şema veya API sözleşmesini bozmaz.

## ADR-026 — CSP kararı

- **Tarih:** 23 Eylül 2026
- **Durum:** Pending (bilinçli ertelendi)
- **Karar:** Blog içeriğinde arbitrary HTML/iframe/script olmadığından CSP
  tasarımı Phase 2'ye göre daha kolay hale gelmiştir (script-src için
  `'self'` yeterli olabilir), ancak nonce/deployment stratejisi henüz
  production ortamında doğrulanmadığından bu fazda da eklenmedi.
- **Neden:** SECURITY.md'de belirtildiği gibi, siteyi bozan veya
  `unsafe-eval`/`unsafe-inline` içeren göstermelik bir CSP eklemek gerçek
  güvenlik kazancı sağlamaz; deployment ortamı (Vercel) netleşmeden nonce
  stratejisi doğru kurulamaz.

## ADR-028 — Neden `@react-pdf/renderer`

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** PDF CV üretimi için `@react-pdf/renderer` 4.9.0 (stable, güncel)
  kullanıldı; kurulumdan önce `npm view` ile React 19 peer desteği doğrulandı
  (`peerDependencies.react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`).
  Pre-release/beta sürüm kullanılmadı.
- **Neden:** Paket, React component modeliyle (JSX ile `<Document>`/`<Page>`/
  `<Text>`) PDF tanımlamaya izin verir; bu, mevcut React/TypeScript kod
  tabanıyla doğal olarak örtüşür ve ayrı bir template dili (örn. LaTeX, HTML-
  to-PDF headless browser) öğrenmeyi/işletmeyi gerektirmez. Node için
  `renderToBuffer` gibi sunucu tarafı API'ler sunar (ADR-029).

## ADR-029 — Neden server-side PDF üretimi

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** PDF, `GET /api/cv/pdf` Route Handler'ında `renderToBuffer()` ile
  tamamen sunucuda üretilir ve `application/pdf` response olarak döner.
  Client-side `PDFDownloadLink` (react-pdf'in tarayıcıda render eden varyantı)
  kullanılmadı.
- **Neden:** Public kullanıcıya react-pdf/PDFKit runtime'ının (birkaç yüz KB)
  hiç gönderilmemesi performans açısından tercih edilir; ayrıca sunucu tarafı
  üretim, `getPublicCvData()` DTO'sunu (aynı gizlilik filtresiyle) tek bir
  güvenilir noktada kullanmayı sağlar — client'a hassas alanların hiç
  ulaşmaması garantilenir. Next.js App Router Route Handler'ları varsayılan
  olarak Node.js runtime'da çalıştığından (`export const runtime = "nodejs"`
  ile açıkça işaretlendi) mevcut deployment modeliyle uyumludur; teknik bir
  engel çıkmadığı için client-side alternatif değerlendirilmedi.

## ADR-030 — Neden Helvetica ve tek kolon (tarihsel; 1.1.0 ile superseded)

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** PDF şablonu yalnızca react-pdf'in gömülü standart fontlarını
  (Helvetica, Helvetica-Bold, Helvetica-Oblique) kullanır; harici/custom font
  dosyası embed edilmez. Layout tek kolon, A4, açık arka plan/koyu metindir.
- **Neden:** Standart fontlar ATS tarayıcı yazılımlarıyla en yüksek uyumluluğa
  sahiptir ve font embedding'in üretebileceği encoding/glyph sorunlarını
  ortadan kaldırır. Tek kolon, PDF metin çıkarımının (text extraction) sütun
  sırasını karıştırmadan doğru okuma sırasıyla çalışmasını garanti eder —
  çok kolonlu/sidebar'lı CV'ler birçok ATS parser'ında satırları yanlış
  sırada birleştirir.

## ADR-031 — Neden grafik/skill-bar/ikon/fotoğraf yok

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** PDF ve web CV şablonlarının hiçbiri skill percentage bar, ikon,
  grafik, timeline görseli veya profil fotoğrafı render etmez. Yetenekler
  gerçek isimleriyle (kategori altında metin listesi olarak) gösterilir.
- **Neden:** (1) Percentage/skill-bar gösterimi öznel ve ölçülemezdir — "%95
  JavaScript" gibi bir sayının nesnel bir karşılığı yoktur. (2) Grafik/ikon
  içerik ATS metin çıkarımında kaybolur veya anlamsız karakterlere dönüşür.
  (3) Fotoğraf, ayrımcılık riskini azaltmak ve ATS/OCR uyumluluğunu korumak
  için ana ATS şablonuna dahil edilmemiştir (bkz. SECURITY.md "PDF content
  policy").

## ADR-032 — Text-first PDF (seçilebilir/aranabilir içerik)

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** PDF'in tüm CV içeriği react-pdf `<Text>` node'ları olarak
  üretilir; hiçbir bölüm screenshot/image'e dönüştürülmez.
- **Neden:** ATS yazılımları PDF'ten metin çıkararak anahtar kelime eşleştirmesi
  yapar; görsel olarak render edilmiş metin (ör. bir canvas screenshot'ı)
  hiçbir ATS tarafından okunamaz. `tests/phase4-http.mjs` ve
  `tests/pdf-text-extract.mjs`, üretilen PDF'ten gerçek metin çıkarılabildiğini
  otomatik olarak doğrular — bu iddia teoride kalmaz, test edilir.

## ADR-033 — Tek veri kaynağı ve public CV DTO

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** `src/server/cv/repository.ts` içindeki `getPublicCvData()`,
  `/cv`, `/api/cv/pdf` ve admin ATS paneli tarafından ortak kullanılan TEK
  DTO builder'dır. Hiçbir tüketici kendi veri sorgusunu yazmaz veya CV verisini
  ikinci bir tabloya/JSON'a kopyalamaz.
- **Neden:** Requirement'ın "tek veri kaynağı" ilkesini teknik olarak
  garantiler: profil bilgisi güncellendiğinde hem web hem PDF aynı anda,
  aynı sorgudan güncel veriyi görür (ayrıca bkz. ARCHITECTURE.md §16,
  TEST_LOG.md "tutarlılık" testi).

## ADR-034 — ATS checker deterministic ve skor formülü

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** ATS Uyumluluk Kontrolü (`src/features/cv/ats-rules.ts`) saf
  fonksiyonlardır: `evaluateAtsRules(data)` girdi dışında hiçbir state okumaz/
  yazmaz, ağ çağrısı yapmaz, AI kullanmaz. Skor: her kural `pass=1`,
  `warning=0.5`, `fail=0` kredi puanı alır; `score = Σ(weight × credit) /
  Σ(applicable weight) × 100` formülüyle hesaplanır ve `applicable=false`
  olan kurallar (örn. deneyim yokken tarih tutarlılığı kuralı) hem paydan hem
  paydan çıkarılır.
- **Neden:** Aynı girdi her zaman aynı skoru üretir (test edilebilir,
  `tests/ats-rules.test.ts`'de doğrulanmıştır); akademik sunumda "bu sayı
  nereden geliyor" sorusuna tam şeffaf bir cevap verilebilir. Uygulanamaz
  kuralların dahil edilmemesi, örneğin hiç deneyimi olmayan yeni mezun bir
  kullanıcının, sahip olmadığı bir bölüm yüzünden haksız yere düşük skor
  almasını engeller.

## ADR-035 — ATS score gerçek bir ATS sonucu değildir

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Hem admin UI'da (`AtsReport` bileşeni) hem dokümantasyonda şu
  ifade sabit olarak yer alır: "Bu skor, projede tanımlanan deterministik
  kontrol kurallarına göre hesaplanan bir uyumluluk göstergesidir; gerçek
  işveren ATS sisteminin verdiği skor değildir." Sahte "LinkedIn ATS Score"
  veya "Workday Score" gibi üçüncü taraf marka adları asla üretilmez.
- **Neden:** Gerçek ATS sistemlerinin (Workday, Greenhouse, Taleo vb.)
  algoritmaları proprietary'dir ve halka açık değildir; bu sistemin onları
  simüle ettiğini iddia etmek yanıltıcı ve akademik olarak savunulamaz
  olurdu. Netlik, güvenilirliğin bir parçasıdır.

## ADR-036 — Public CV privacy yaklaşımı

- **Tarih:** 23 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Gizlilik, DTO builder seviyesinde (sorgu/response oluşturma
  anında) uygulanır — CSS ile gizleme veya client-side koşullu render
  kullanılmaz. `profiles.is_email_visible` / `is_location_visible` false ise
  ilgili alan `getPublicCvData()` çıktısında `null` olarak döner; bu `null`
  değer hiçbir zaman gerçek değere geri dönüştürülemez çünkü sunucu onu hiç
  serialize etmemiştir.
- **Neden:** "Sadece CSS ile gizlemek YASAK" gereksinimi birebir karşılanır;
  tarayıcı DevTools'tan HTML/JSON incelense dahi gizli alan bulunamaz. Aynı
  ilke `docs/SECURITY.md`'de test kanıtlarıyla belgelenmiştir.

## ADR-037 — CV versioning ertelendi

- **Tarih:** 23 Eylül 2026
- **Durum:** Pending (bilinçli ertelendi)
- **Karar:** Frontend/Backend/Google/şirkete-özel CV gibi çoklu CV
  versiyonlama sistemi bu fazda kurulmadı; `cv_settings` tek satırlık
  (`id = 'primary'`) bir singleton'dır, projects/skills tablosu ile aynı
  desende (`profiles`, `site_settings` gibi).
- **Neden:** Requirement, tek ana CV'nin bu faz için yeterli olduğunu açıkça
  belirtiyor. Gelecekte gerekirse `cv_settings` çoğullaştırılabilir
  (`id` yerine `slug`/`variant` alanı eklenerek) — mevcut singleton tasarım
  buna mimari olarak engel değildir, sadece bu fazda gereksiz karmaşıklık
  eklenmedi.

## ADR-038 — Inline image ertelendi

- **Tarih:** 23 Eylül 2026
- **Durum:** Pending (bilinçli ertelendi)
- **Karar:** Tiptap editörüne rich-text içine gömülü (inline) görsel
  eklenmedi; yalnız post cover (mevcut R2/media akışı üzerinden) desteklenir.
- **Neden:** Inline image, editör toolbar'ına yeni bir upload akışı,
  içerik JSON şemasına yeni bir `image` düğüm türü ve bu düğüm için ayrı bir
  allowlist/render kuralı eklemeyi gerektirir. Bu, Phase 3'ün "sade ve
  profesyonel ilk sürüm" hedefiyle çelişir. Data URL/base64 hiçbir zaman
  kabul edilmeyecek ve external arbitrary image URL'i editöre serbestçe
  gömülmeyecektir; inline image eklenirse mevcut güvenli R2/media akışı
  yeniden kullanılmalıdır.

## ADR-039 — Statik CSP; request nonce kullanılmaması

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** CSP `next.config.ts` response header'ı olarak uygulanır. Next/React
  bootstrap için production `script-src` ve mevcut inline style kullanımı için
  `style-src` dar `unsafe-inline` içerir; wildcard ve production `unsafe-eval`
  içermez. `unsafe-eval` yalnız development HMR'da açılır.
- **Neden:** Next.js 16 resmî rehberine göre request nonce bütün sayfaları dynamic
  yapar, static optimization/PPR/CDN cache'i kaldırır. Bu kişisel CMS'de inline
  untrusted HTML render edilmediğinden performans maliyeti haklı değildir.
  Experimental SRI, production güvenlik sınırının zorunlu parçası yapılmamıştır.

## ADR-040 — HSTS kapsamı

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Yalnız production'da `max-age=31536000`; `includeSubDomains` ve
  `preload` yoktur.
- **Neden:** Alt domainlerin tamamının HTTPS envanteri bilinmeden bu iki direktif
  geri dönüşü zor outage riski taşır; localhost development etkilenmemelidir.

## ADR-041 — Permissions Policy

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Camera, microphone ve geolocation bütün site için kapalıdır.
- **Neden:** Mevcut ürün bu API'leri kullanmaz. WebGL/Three.js bu direktiflerin
  konusu değildir; gelecekteki görsel fazı yanlışlıkla engellenmez.

## ADR-042 — Custom mutation same-origin sınırı

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** `/api/admin/**` unsafe method'ları auth kontrolünden önce exact
  `BETTER_AUTH_URL` Origin/Fetch Metadata kontrolünden geçer; Origin taşımayan
  trusted CLI/server istemcileri korunur.
- **Neden:** Better Auth kendi endpoint'lerini korur; uygulama Route Handler'ları
  için aynı korumayı varsaymak doğru değildir. SameSite cookie tek başına bütün
  gelecekteki browser senaryoları için yeterli sınır değildir.

## ADR-043 — R2 CORS ve public origin

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Exact production origin (opsiyonel exact localhost), yalnız PUT ve
  Content-Type; wildcard yoktur. Production public media custom domain kullanır;
  r2.dev yalnız development içindir.
- **Neden:** Presigned URL bearer capability'dir; CORS credential güvenliği
  sağlamasa da browser upload yüzeyini beklenen origin'e daraltır. Custom domain
  cache/WAF ve production operasyonu sağlar.

## ADR-044 — R2 magic-byte Range GET

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** HEAD doğrulamasından sonra ilk 16 byte Range GET ile JPEG/PNG/WebP
  signature kontrol edilir.
- **Neden:** Direct upload'da server PUT body'yi görmez. Küçük ek read/latency,
  tüm 5 MB object'i proxy etmeden MIME spoofing'e karşı gerçek kontrol sağlar.

## ADR-045 — Rate-limit production yaklaşımı

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Better Auth login için database 5/60 limiter korunur. Custom admin
  endpoint'lerine process-local veya yeni distributed limiter eklenmez.
- **Neden:** Tek admin + session/origin + kısa presign token yeterli başlangıç
  sınırıdır; process-local sayaç serverless'ta yanıltıcıdır. Vercel proxy/IP
  zinciri canlıda doğrulanmadan spoof edilebilir header'a güvenilmez.

## ADR-046 — Runtime environment validation

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Build secretsız kalır; DB/auth/R2 değerleri yalnız ilgili runtime
  yolunda doğrulanır. Production local/localhost/insecure/yanlış protokol ve kısa
  secret değerlerini reddeder.
- **Neden:** Phase 1'in deploy edilebilir build kararı korunurken yanlış production
  config sessizce çalışmaz. Client'a secret aktarılmaz.

## ADR-047 — Cache/privacy ve PDF

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Gizlilik filtresi repository DTO'sunda cache'den önce; admin/auth ve
  bütün PDF sonuçları no-store. PDF ayrıca cache/distributed limiter eklenmeden
  request-time güncel üretilir.
- **Neden:** CV değişikliğinin anında görünmesi ve gizli alanların cache'e hiç
  girmemesi, mevcut küçük payload için stale-cache optimizasyonundan önemlidir.

## ADR-048 — 2FA ve password reset ertelendi

- **Tarih:** 24 Eylül 2026
- **Durum:** Pending (bilinçli ertelendi)
- **Karar:** Phase 5'te 2FA veya yarım e-posta reset akışı eklenmez; recovery
  güvenilir operator/CLI prosedürüdür.
- **Neden:** 2FA tek admin hesabı için değerlidir fakat recovery code, enrollment
  ve operasyon akışı birlikte tasarlanmalıdır. Mail altyapısı olmadan reset
  endpoint'i güvenli ve tamamlanmış bir özellik olmaz.

## ADR-049 — DOM hareket sistemi olarak Anime.js

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Reveal, stagger ve timeline scroll progress Anime.js 4.5.0'ın
  `animate`, `stagger`, `createScope` ve `onScroll` API'leriyle uygulanır.
- **Neden:** Küçük bir DOM animasyon yüzeyi, explicit lifecycle cleanup ve
  güncel scroll API'si sağlar; GSAP/Framer/Lenis gibi ek sistemlere gerek yoktur.

## ADR-050 — 3D görsel katman olarak Three.js

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Hero ve Skill Universe prosedürel sahneleri stable Three.js 0.186.0
  ile oluşturulur.
- **Neden:** WebGL resource lifecycle, draw object sayısı, DPR ve render loop
  üzerinde doğrudan kontrol gerekir; CSS/SVG hedeflenen uzamsal anlatımı tek
  başına karşılamaz.

## ADR-051 — Vanilla Three.js; R3F/Drei kullanılmaması

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** React Three Fiber ve Drei eklenmez; React yalnız mount/unmount
  boundary'sidir, scene imperative Three API ile yönetilir.
- **Neden:** İki küçük prosedürel scene için ek renderer abstraction/bundle
  gereksizdir; cleanup ve offscreen pause davranışı doğrudan görülebilir kalır.

## ADR-052 — WebGLRenderer; WebGPURenderer kullanılmaması

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** WebGL2 ön kontrolüyle `WebGLRenderer` kullanılır; experimental
  WebGPURenderer Phase 6 kapsamına alınmaz.
- **Neden:** Sahneler WebGPU özelliği gerektirmez. WebGL2 + CSS fallback daha
  kontrollü compatibility matrisi ve daha düşük akademik risk sağlar.

## ADR-053 — Canvas ana içerik değildir

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Hero metni, CTA, skill adları/sayıları ve timeline gerçek HTML'dir;
  canvas `aria-hidden` dekoratif enhancement'tır.
- **Neden:** SEO, screen reader, no-JS ve WebGL failure durumunda bilgi kaybı
  olmamalıdır.

## ADR-054 — Reduced-motion statik kalite kademesi

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** `prefers-reduced-motion: reduce` translate/scroll-linked/sürekli
  hareketi kapatır; sahne bir kez render edilir, timeline tam görünür.
- **Neden:** Erişilebilirlik tercihi içerik azaltmadan hareket yükünü azaltmalıdır.

## ADR-055 — Mobile quality tier ve DPR cap

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Viewport/hardwareConcurrency ile static/mobile/tablet/desktop
  seçilir; node count azalır ve DPR sırasıyla 1/1/1.25/1.5 üst sınırına sahiptir.
- **Neden:** Fiziksel DPR'yi körlemesine kullanmak fragment maliyetini gereksiz
  büyütür; küçük ekranda desktop yoğunluğu görsel fayda sağlamaz.

## ADR-056 — Visibility-aware render loop ve explicit dispose

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** IntersectionObserver viewport dışında, Visibility API gizli sekmede
  loop'u durdurur. Unmount RAF/listener/observer/geometry/material/renderer ve
  canvas kaynağını temizler.
- **Neden:** Sürekli arka plan GPU tüketimini ve SPA navigation memory leak'ini
  önlemek, görsel akıcılıktan daha temel bir doğruluk gereksinimidir.

## ADR-057 — Skill Universe accessibility ve public DTO

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Three görünümünün yanında aynı minimum public skill verisi focus/tap
  destekli HTML button listesinde sunulur; aggregate yalnız published projects'tir.
- **Neden:** Canvas tek bilgi kaynağı olamaz; admin metadata ve görünmez kayıtlar
  client'a sızmamalıdır.

## ADR-058 — Ağır post-processing kullanılmaması

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Bloom, volumetric effect, HDR, texture/model ve physics zinciri yoktur.
- **Neden:** Premium/minimal yön düşük object count ve ince çizgilerle sağlanır;
  portfolyo bir GPU benchmark'a dönüştürülmez.

## ADR-059 — Route-local lazy enhancement

- **Tarih:** 24 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Three sahneleri landing client boundary içinde `ssr: false` dynamic
  import edilir; blog detail, CV ve admin bu component'leri import etmez.
- **Neden:** SSR window/WebGL hatası ve ilgisiz route'larda ağır bundle maliyeti
  önlenirken Server Component veri/HTML yapısı korunur.

## ADR-060 — Custom/minimal command palette

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Komut paleti `cmdk` benzeri bir kütüphane yerine vanilla React,
  saf `buildCommandIndex`/`filterCommands` fonksiyonları ve yerel `<dialog>` ile
  yazılmıştır. Dialog kodu ilk açılışta `next/dynamic` ile yüklenir.
- **Neden:** İhtiyaç birkaç düzine komut üzerinde ad/anahtar kelime/grup
  eşleşmesidir. Bu, yeni dependency ve bakım yükü olmadan test edilebilir biçimde
  karşılanır; combobox erişilebilirlik deseni doğrudan uygulanabilmiştir. Üretilen
  palet chunk'ı 8.1 KB'tır.

## ADR-061 — Ortak native dialog tabanlı modal

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Palet, terminal ve lightbox tek `ModalDialog` bileşenini kullanır:
  `showModal()`, Tab trap, Escape/backdrop kapanışı, focus restoration.
- **Neden:** Yarım erişilebilir üç ayrı modal yerine tek, test edilmiş bir
  davranış. Native modal arka planı inert yapar. StrictMode çift mount'unda
  asenkron `close` olayının yeniden açılan diyaloğu kapatması hatası bulunmuş;
  `close` yalnız diyalog gerçekten kapalıysa işlenir.

## ADR-062 — Terminal gerçek shell değildir

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Terminal, sabit bir komut registry'sinde anahtar araması yapan
  deterministik bir dispatcher'dır. Argüman, pipe, eval, Function, ağ isteği,
  dosya sistemi veya veritabanı erişimi yoktur; çıktı düz metin + allowlist
  bağlantıdır. Geçmiş yalnız bellektedir.
- **Neden:** Easter egg'in amacı içerikte gezinmeyi eğlenceli kılmaktır. Gerçek
  yürütme yüzeyi hiçbir işlevsel fayda sağlamadan XSS/RCE saldırı yüzeyi
  yaratırdı.

## ADR-063 — GitHub verisi server-side alınır

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** GitHub REST API çağrıları yalnız `src/server/github/repository.ts`
  (`server-only`) içinde yapılır; UI dar DTO alır.
- **Neden:** Token client'a sızamaz, CSP `connect-src 'self'` olarak kalır,
  ziyaretçi IP'si GitHub'a gönderilmez ve cache tek noktada yönetilir.

## ADR-064 — GitHub cache/revalidation: 6 saat

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Profil + repo snapshot'ı `unstable_cache` ile 21.600 saniye
  cache'lenir; başarısız istekler cache'lenmez, sunucu örneği başına 10 dakika
  hata bekleme süresi ve 4 saniye istek zaman aşımı uygulanır.
- **Neden:** Kimlik doğrulamasız sınır IP başına saatte 60 istektir (güncel
  GitHub dokümanı ve canlı `x-ratelimit-limit: 60` header'ı ile doğrulandı). Her
  yenileme 2 istek kullanır; 6 saatlik pencere günde örnek başına yaklaşık 8
  istek demektir ve paylaşımlı serverless IP'lerinde bile sınırın çok altında
  kalır. Portfolyo repo listesi dakikalar içinde değişmesi gereken bir veri
  değildir; birkaç saatlik gecikme kabul edilebilir. Landing `force-dynamic`
  olduğundan `fetch` revalidate seçeneği etkisizdir (Next.js dokümanı); Cache
  Components'e geçiş bütün route segment config'lerini değiştireceği için bu
  fazın kapsamı dışında tutulmuş, Next.js'in Cache Components kullanmayan
  projeler için belgelediği `unstable_cache` seçilmiştir.

## ADR-065 — GitHub token opsiyoneldir

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** `GITHUB_TOKEN` zorunlu değildir; varsa server fetch'e Bearer olarak
  eklenir. `NEXT_PUBLIC_` altında tanımlanmaz; OAuth kurulmaz.
- **Neden:** Public profil ve public repo uç noktaları kimlik doğrulaması
  gerektirmez; 6 saatlik cache ile anonim sınır yeterlidir. Token yalnız paylaşımlı
  IP'de rate limit riskine karşı bir seçenektir.

## ADR-066 — Private repository veri politikası

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Yalnız public uç noktalar kullanılır; `private: true` veya
  `visibility` değeri `public` olmayan kayıtlar ayrıca elenir. CMS'de private
  işaretli proje repo URL'leri sunucuda okunup GitHub listesinden çıkarılır ve
  client'a gönderilmez. Fork ve arşivlenmiş repolar gösterilmez.
- **Neden:** GitHub entegrasyonu Phase 2'nin "private repo URL'si public'e
  sızmaz" ilkesini delmemelidir. Token yanlışlıkla geniş yetkili olsa bile public
  filtreleme korunur.

## ADR-067 — GitHub kullanıcı adı kaynağı

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Kullanıcı adı önce görünür `social_links` kaydındaki tam
  `https://github.com/<kullanıcı>` URL'sinden, yoksa server-only `GITHUB_USERNAME`
  değerinden türetilir ve GitHub kullanıcı adı kuralıyla doğrulanır.
- **Neden:** Kaynak koda kişisel veri sabitlenmez ve yeni veritabanı alanı/
  migration gerekmez; mevcut public veri tek doğruluk kaynağı olarak kalır.

## ADR-068 — Architecture sunumu text/data-driven kalır

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** `architectureDescription` yalnız metin olduğundan paragraf/liste
  ayrıştırması ve teknik panel stili uygulanır; diyagram/node üretilmez.
  Yapısal mimari editörü gelecek özellik olarak bırakılır.
- **Neden:** Veritabanında olmayan bir teknoloji akışını çizmek sahte bilgi
  üretmek olurdu; bitirme projesi raporunda doğrulanamaz iddia yer almamalıdır.

## ADR-069 — Ağır UI kütüphanesi eklenmemesi

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Phase 7'de yeni runtime dependency yoktur (cmdk, Radix, Headless UI,
  carousel/lightbox kütüphanesi, xterm.js vb. eklenmedi).
- **Neden:** Mevcut ihtiyaçlar native dialog ve küçük React bileşenleriyle
  karşılanmıştır; Phase 6 bundle/performans kazanımları korunur.

## ADR-070 — Public/admin layout ayrımı

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Header/footer root layout'tan `(public)/layout.tsx` ve
  `admin/layout.tsx` içine taşınmıştır. Public layout, komut verisini sunucuda
  hazırlar; admin layout Phase 0–6 görünümünü (ortak header + sade footer) korur.
  `notFound()` için `(public)/not-found.tsx`, eşleşmeyen URL için root
  `not-found.tsx` kullanılır.
- **Neden:** Public veri ve dialog kodunun admin bundle'ına girmemesi ve statik
  `/admin/login` sayfasının veritabanına bağımlı hâle gelmemesi. İlk denemede
  root `not-found.tsx` public layout içinde de render edildiği için header iki
  kez görünmüş; ayrım bu hatayı gidermiştir.

## ADR-071 — Diyalog açıkken dekoratif canvas duraklatılır

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Açık modal varken Hero ve Skill Universe render loop'u frame
  istemez; renderer, scene veya geometry yeniden oluşturulmaz.
- **Neden:** Kullanıcı diyalogla çalışırken görünmeyen dekoratif animasyona GPU
  harcanmaz; mevcut Phase 6 lifecycle'ı (visibility/intersection pause) aynı
  mekanizmayla genişletilir.

## ADR-072 — Ctrl/Cmd+K çakışma politikası

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Odak bir input, textarea, select veya contenteditable içindeyse
  kısayol yok sayılır (paletin kendi alanı hariç; orada toggle olarak kapatır).
  Başka bir modal açıkken palet üst üste açılmaz. Kısayol yalnız public layout'ta
  dinlenir.
- **Neden:** Tarayıcı ve form kullanımını bozmamak; admin Tiptap editörü gibi
  alanlarda beklenmeyen davranış oluşmaması.

## ADR-073 — GitHub avatarı gösterilmez

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** `avatars.githubusercontent.com` görseli kullanılmamıştır.
- **Neden:** CSP `img-src` ve `next/image` remote pattern'lerinin yalnız avatar
  için genişletilmesi gerekirdi; bilgi değeri düşüktür.

## ADR-074 — Neden Vercel

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi (deploy kullanıcı kararıyla ertelendi)
- **Karar:** Hedef hosting Vercel'dir.
- **Neden:** Next.js 16 App Router, Route Handler, `next/image` optimizer ve
  `unstable_cache` data cache'i ek yapılandırma olmadan desteklenir; HTTPS,
  environment scope'ları (Development/Preview/Production), runtime logları ve
  anında rollback tek hesap içinde gelir. Tek kişilik bitirme projesi için ayrı
  container/altyapı yönetimi gereksiz karmaşıklıktır.

## ADR-075 — Preview ortamı ve veritabanı

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi (uygulanmadı)
- **Karar:** Preview deployment'lar production veritabanına yalnız
  `--read-only` Turso token'ı ile bağlanır; R2 credential'ı almaz; auth secret'ı
  production'dan farklıdır. Ayrı bir preview veritabanı kurulmaz.
- **Neden:** Tek kişilik projede ikinci veritabanını senkron tutmak orantısız
  maliyettir; salt-okunur token, preview'ın production verisini yanlışlıkla
  değiştirmesini platform seviyesinde engeller.

## ADR-076 — Production auth origin; preview auth desteklenmez (Yaklaşım B)

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Better Auth `trustedOrigins` yalnız `BETTER_AUTH_URL` (canonical
  production origin) olarak kalır. Preview'da `BETTER_AUTH_URL` de production
  origin'idir; bu yüzden preview URL'sinden yapılan admin istekleri origin
  kontrolünde reddedilir. `*.vercel.app` wildcard'ı eklenmez.
- **Neden:** Admin yalnız production'da gerekir. Wildcard güvenilir origin,
  herhangi bir Vercel projesinin origin'ini güvenilir kılabilirdi. Preview'ın
  salt-okunur DB token'ı zaten oturum yazamaz; Yaklaşım A ek güvenlik yüzeyi
  getirip fayda sağlamazdı.

## ADR-077 — R2 public delivery: custom domain tercih, r2.dev geçici

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Proje sahibinin tercihiyle ilk kurulumda `r2.dev` Public Development
  URL kullanılacaktır; production final çözümü Cloudflare zone'undaki bir medya
  alt alan adıdır.
- **Neden:** Cloudflare dokümanı `r2.dev`'i rate-limited ve development amaçlı
  olarak tanımlar; custom domain önbellek/WAF özelliklerini sağlar. Custom domain
  bulunmadığından geçici çözüm açıkça pending olarak işaretlenmiştir.
  `R2_PUBLIC_BASE_URL` değişince build yeniden yapılmalıdır (remote pattern/CSP).

## ADR-078 — R2 CORS politikası

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi (uygulanmadı)
- **Karar:** AllowedOrigins = exact production origin (+ gerekiyorsa
  `http://localhost:3000`), AllowedMethods = PUT, AllowedHeaders = Content-Type,
  ExposeHeaders = ETag, MaxAge 3600. Wildcard yoktur.
- **Neden:** Browser yalnız presigned PUT yapar; GET public delivery üzerinden
  CORS gerektirmez. Dar kural, başka origin'lerin sızmış bir presigned URL'yi
  browser'dan kullanmasını da zorlaştırır.

## ADR-079 — Turso production yaklaşımı

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi (uygulanmadı)
- **Karar:** Migration yalnız mevcut `npm run db:migrate` ile, secret'lar
  `vercel env run -e production` ile enjekte edilerek uygulanır; migration
  history değiştirilmez; production'a fake içerik seed edilmez; ilk admin
  `auth:bootstrap` gizli parola prompt'u ile oluşturulur. Yedekleme Turso PITR
  (plan penceresi) ile sağlanır.
- **Neden:** Secret'ların diske (`.env`) yazılmaması ve production veri
  bütünlüğünün korunması.

## ADR-080 — Deployment smoke test yaklaşımı

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Production doğrulaması yıkıcı olmayan betiklerle yapılır: public
  smoke (header/route/404/PDF/leak), salt-okunur Turso smoke ve DB'ye satır
  yazmayan, kendi object'ini silen R2 smoke. Secret'lar yalnız eşleşme sayısı
  olarak raporlanır; admin parolası gizli prompt ile alınır, hard-code edilmez.
  Rate-limit testi var olmayan bir hesapla yapılır.
- **Neden:** Production verisine ve gerçek admin hesabına dokunmadan tekrarlanabilir
  kanıt üretmek.

## ADR-081 — Social links CRUD

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi
- **Karar:** Mevcut şema kullanılır (migration yok); platform sabit enum'dur;
  URL yalnız kimlik bilgisi içermeyen `https:` olabilir; GitHub platformu profil
  URL'si ister; mutation'lar `requireAdminApi()`; public DTO ayrıca https filtresi
  uygular (savunma derinliği).
- **Neden:** Phase 7'deki `javascript:` bulgusunun kaynağı olan eksik yönetim
  arayüzünü güvenli biçimde kapatmak ve GitHub kullanıcı adını env yerine içerikten
  yönetmek.

## ADR-082 — Public deploy'un ertelenmesi

- **Tarih:** 26 Eylül 2026
- **Durum:** Kabul edildi (proje sahibi kararı)
- **Karar:** Phase 8'de uzak repository oluşturulmadı, Vercel projesi açılmadı,
  bulut kaynağı oluşturulmadı; çalışma yerel bilgisayarda tutuldu.
- **Neden:** Proje sahibi sitenin şu aşamada public olmamasını tercih etti.
  Deployment rehberi ve smoke betikleri, karar değiştiğinde doğrudan
  uygulanabilecek biçimde hazırlandı; yapılmamış testler "beklemede" olarak
  raporlandı.

## ADR-083 — İçerik rolleri ve privacy-first CV (1.1.0)

- **Tarih:** 26 Eylül 2026
- **Durum:** Uygulandı
- **Karar:** Hero shortBio / About longBio / CV override→longBio ayrıdır.
  Timeline yalnız education/experience. Program boş string kabul eder;
  legacy dash placeholder render sırasında elenir, kayıt değiştirilmez.
  Telefon ayrı görünürlük; social `showInCv` ayrı CV filtresidir.
- **Neden:** Tekrarlı metin ve gerçekte olmayan eğitim programı gereksinimini
  kaldırmak; website-visible sosyal hesabın istemeden CV'ye gitmesini önlemek.
- **Sonuç:** Ayrı `(career)` layout CV shell/RSC sınırını da korur;
  additive migration mevcut kayıtları korur. GitHub/LinkedIn/Website default
  CV true, diğerleri false; admin tercihi bağımsızdır.

## ADR-084 — Unicode ATS PDF ve ölçülü landing atmosferi

- **Tarih:** 26 Eylül 2026
- **Durum:** Uygulandı; ADR-030 font kararı superseded
- **Karar:** Gömülü yerel statik Noto Sans 400/700 TTF, OFL lisansı;
  tek kolon gerçek metin. Türkçe ve ligature extraction test edilir.
  Fixed grid/radial/signal CSS variables, passive scroll/rAF ve section
  observer; reduced-motion reset/statik fallback. Terminal header yardımcısı.
- **Neden:** Helvetica Türkçe Unicode glyph kapsamı yetersizdir. Yerel
  font ağ bağımlılığını kaldırır; tek kolon okuma sırasını korur.
  Transform/opacity değişimi React rerender ve layout animasyonu gerektirmez.
- **Sınırlama:** FPS/Lighthouse, fiziksel cihaz ve reduced-motion runtime
  emülasyonu ölçülmedi. ATS vendor kabulü iddia edilmez.

## ADR-085 — Bir obje, çok bölüm; doğal scroll ile anlatı

- **Tarih:** 26 Eylül 2026
- **Durum:** Uygulandı, 1.2.0
- **Karar:** Aynı prosedürel lattice core/flow/build/network/path arasında morph olur. Hero→About→Projects→Skills→Journey→Blog/CV/GitHub→Contact config'i transform, yoğunluk ve line/particle miktarını düzenler. Optional veri bölümleri ölçülen chapter listesinde atlanır.
- **Neden:** Dekoratif Hero objesini bölüm anlamlarıyla ilişkilendirmek; Utsubo'nun scroll zamanını anlatıya bağlama ilkesini özgün teknik portfolyoya uygulamak. Hayvan/model/asset/layout kopyalamamak; sıfır model/texture dosyası ve yeni dependency.
- **Sonuç:** Server public DTO'lar ve gerçek HTML sırası korunur. Passive native scroll + tek rAF, cache edilmiş section geometrileri ve mutable subscription React render selini önler. Primary ve secondary canvas ayrıdır; reveal/scroll transform hedefleri çakışmaz. Tüm sayfayı pinlemek veya scroll-jacking yerine viewport-fixed sahne ve normal içerik akışı seçildi.

## ADR-086 — Narrative progressive enhancement ve ölçüm sınırı

- **Tarih:** 26 Eylül 2026
- **Durum:** Uygulandı, 1.2.0
- **Karar:** SSR CSS core + canvas dışı metin; desktop 312/mobile 84 vertex, DPR cap, on-demand primary render; overlay/hidden/landing dışı pause, context-loss fallback ve dispose. Runtime OS preference + açık kullanıcı hareket azaltma seçimi, Skill Universe static selection repaint.
- **Neden:** Deneyimin içeriğe ve erişilebilirliğe bağımlı değil, onları destekleyen bir katman olması. Performans becerisi doğrultusunda FPS kazancı/Lighthouse skorunu ölçmeden iddia etmemek.
- **Kanıt/sınır:** Browser 3 draw call ve responsive state ölçümleri, 75 unit; FPS/GPU trace, fiziksel cihaz ve OS preference emülasyonu yapılmadı. Manuel reduced runtime aynı sadeleştirme yolunu test eder, OS testi yerine geçmez.

## ADR-087 — Data Spine ana anlatı objesidir

- **Tarih:** 27 Eylül 2026
- **Durum:** Uygulandı, 1.3.0; ADR-085'in küre/lattice morph kısmını geçersiz kılar
- **Karar:** Primary obje **Data Spine = veri omurgası + mühendislik izi**. Sabit topolojili prosedürel eksen/node/halka/tel/ağ/sinyal; section dönüşümleri yalnız eğrilik, girth, ağ açılımı, yoğunluk ve konumla yapılır. GLTF/texture yok.
- **Neden:** Kürenin şekil bozulması anlamsızdı ve Contact'ta içeriğin üzerine geliyordu. Omurga; sistem, bağlantı ve ilerleme fikrini section işlevlerine (üretim rayı, ağ, kariyer yolu) bağlar ve kimliğini kaybetmez.
- **Sonuç:** 6 draw call (önceki 3); desktop 1286 / mobile 420 vertex. Sürekli rAF yalnız landing görünürken; mobile ve idle 30 fps cap. Reduced motion'da on-demand statik çizim.

## ADR-088 — Projects: 3D node + SVG connector + HTML kart

- **Tarih:** 27 Eylül 2026
- **Durum:** Uygulandı, 1.3.0
- **Karar:** Kartlar HTML kalır. Projects state'inde spine, başlık ile kartlar arasındaki ölçülen band'e oturur; spine noktası kamera projeksiyonuyla ekrana alınır ve SVG bezier ile kart anchor'ına bağlanır. Connector yalnız başlık spine'ın tamamen üstünde ve kart altında iken görünür; mobilde kapalıdır.
- **Neden:** Tamamen 3D kart erişilebilirliği ve tıklanabilirliği bozar; bağımsız kart ise spine ilişkisini kaybeder. Bu “A ile B arası” çözüm hem ilişkiyi hem HTML semantiğini korur.

## ADR-089 — Contact ve footer içerikten önce gelir

- **Tarih:** 27 Eylül 2026
- **Durum:** Uygulandı, 1.3.0
- **Karar:** Contact'ta spine sağ-alt-derin, opacity ≤0.22; tüm dekor katmanları `pointer-events:none`, içerik `z-index:2` ve opak link plakası. Footer yalnız isim ve ©; navigation header'da, iletişim kanalları Contact'ta tek kez sunulur.
- **Kanıt:** Desktop, mobile ve kısa viewport'ta Contact linklerinin tamamı `elementFromPoint` hit-test'ini geçti; Phase 13 HTTP footer'da link/nav olmadığını doğrular.

## ADR-090 — Data Spine tek, sürekli, sayfa boyu rotadır

- **Tarih:** 27 Eylül 2026
- **Durum:** Uygulandı, 1.4.0; ADR-087'nin “section'a göre evrilen state” kısmını ve ADR-088'in band/projeksiyon connector mekanizmasını geçersiz kılar. ADR-089 (Contact/footer önceliği) geçerli.
- **Karar:** Omurga doküman uzayında tek bir spline'dır. Section'lar yalnız lane (rotanın geçtiği kolon) ve hub (rotanın tam geçtiği, branch'lerin çıktığı nokta) bildirir; rota bu DOM noktalarından ölçülerek kurulur. Renderer scroll ile yalnız görüş penceresini kaydırır. Branch'ler SVG, kartlar HTML kalır.
- **Neden:** 1.3.0'da tek sahne olmasına rağmen her section'da farklı bir poz/yer görülüyor, kullanıcı “her bölümde ayrı bir omurga” algılıyordu. Kullanıcının kaba çizimi (tek rota + hub'lar) ve referans görsel tek kesintisiz rota istiyordu.
- **Alternatifler:** (a) Sayfa yüksekliğinde canvas — bellek/texture limitleri nedeniyle reddedildi. (b) 1.3.0 state'lerini yumuşatmak — sürekliliği yapısal olarak garanti etmediği için reddedildi. (c) Yalnız SVG — glow/partikül kalitesi düşük; SVG fallback ve branch katmanı olarak tutuldu.
- **Sonuç:** 3 draw call; desktop ~23k vertex (hepsi shader'da konumlanır). Unit test rotanın örnekler arası sıçramasız, geri dönmesiz ve tüm hub'lardan tam geçtiğini doğrular.


## ADR-091 — Phase 15 core context ve güvenli doğrulama

- **Tarih:** 27 Eylül 2026
- **Durum:** Uygulandı, 1.5.0; ADR-090 tek rota kararı korunur.
- **Karar:** Core, hub/branch arrival ve sağ indicator aynı coreU üzerinden context gösterir. Reduced motion nearest hub'da park eder. Timeline/GitHub item tick'leri ve standalone SecondarySpine aynı görsel dili sürdürür; CV'de okuma ve print önceliklidir.
- **Kapsam:** Önceki turun çalışan uygulaması korunarak yalnız eksik Phase 15 HTTP regresyon entegrasyonu tamamlandı. Yeni backend özellik, refactor, migration veya PDF değişikliği yok.
- **Veri koruması:** Test öncesi ayrı .local-backups/ timestamp DB kopyası, eşleşen SHA-256 ve integrity kontrolü; HTTP yalnız explicit disposable DB. Cleanup tam adlı oturum fixture'ına uygulanır, backup glob'u yoktur.
- **Kanıt:** Unit 90/90, security 6/6, HTTP 97/97; lint/TypeScript/build/audit başarılı. Desktop/mobile ve motion toggle doğrulandı. Gerçek hover matrisi, OS reduced-motion ve print preview sınırlamaları UX_PHASE_REPORT.md içinde açık tutuldu.
