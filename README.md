# Careerfolio

Sürüm 1.9.0 · Kişisel vitrin ve dinamik portfolyo.

Üniversite bitirme projesi olarak geliştirilen; proje, teknik blog, web/PDF CV ve kariyer verilerini tek admin panelinden yöneten kişisel vitrin uygulaması. Sistem tek site sahibine yöneliktir; SaaS veya çok kullanıcılı CV ürünü değildir.

## Özellikler

- `/admin` altında korumalı yönetim paneli: profil, eğitim, deneyim, yetenek, sertifika ve sosyal bağlantı yönetimi
- Project CMS, vaka çalışması, cover/galeri ve private repository politikası
- Tiptap tabanlı Blog CMS, kategori/etiket ve draft/publish
- Admin'den yüklenen profesyonel CV PDF birincil public CV (`/api/cv/pdf`, R2'de saklanır, aynı origin'den sunulur); yükleme yoksa aynı public DTO'dan üretilen metin tabanlı PDF yedek olarak sunulur
- Aynı public DTO'dan web CV (`/cv`)
- Açıklanabilir, deterministik ATS Uyumluluk Kontrolü
- Sertifikalar: görünürlük, CV görünürlüğü, sıralama ve HTTPS doğrulama bağlantısı
- Landing sayfasında scroll ile ilerleyen tek parça "Data Spine" anlatısı (Three.js/SVG), pinned bölüm koreografisi ve hareket azaltma seçimi
- Career Timeline, Command Palette ve güvenli terminal easter egg'i
- Server-side GitHub public API entegrasyonu
- Better Auth, admin role, rate limit, origin, CSP, upload ve privacy kontrolleri

## Teknoloji Yığını

Next.js 16.3.8, React 19.2.8, TypeScript, Tailwind CSS 4, Turso/libSQL, Drizzle ORM, Better Auth, Cloudflare R2, Tiptap, React PDF (`@react-pdf/renderer`), Anime.js, Three.js ve Zod.

## Yerel Kurulum

Gereksinim: Node.js 22.13+ (22.x) veya Node.js 24+ ve npm. Kilitli bağımlılıkların Node sürüm gereksinimleri nedeniyle Node.js 20 desteklenmez. Bulut hesabı gerekmez; yerel veritabanı bir libSQL dosyasıdır.

```bash
npm ci
```

`.env.example` dosyasını `.env.local` olarak kopyalayın. Local veritabanı için `TURSO_DATABASE_URL=file:./local.db`, en az 32 karakterlik rastgele bir `BETTER_AUTH_SECRET` (örn. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) ve `BETTER_AUTH_URL=http://localhost:3000` tanımlayın. `TURSO_AUTH_TOKEN` yalnız uzak Turso için gerekir. R2 ve GitHub değişkenleri opsiyoneldir: R2 boş bırakılırsa medya yükleme "yapılandırılmadı" mesajıyla devre dışı kalır, uygulamanın geri kalanı çalışır. R2 tanımlanırsa proje görseli ve blog kapağı yüklemesi gerçek bucket'a yapılır (JPEG/PNG/WebP, en fazla 5 MB). `npm run dev` altında `*.r2.dev` görselleri yalnız development amaçlı aynı-origin `/api/media/r2` uç noktası üzerinden gösterilir; production'da bu uç nokta 404 döner ve görseller doğrudan R2 public adresinden yüklenir.

```bash
npm run db:migrate
npm run auth:bootstrap -- --email admin@example.com --name "Admin" --role admin
npm run dev
```

`db:migrate` `drizzle/` içindeki migration'ları uygular. Varsayılan admin hesabı veya varsayılan parola yoktur; tek admin hesabı yalnız bu CLI bootstrap ile oluşturulur ve public kayıt (sign-up) sunucu tarafında kapalıdır. Bootstrap parolayı gizli terminal prompt'unda ister (en az 12 karakter); `--password` bayrağı da desteklenir ancak parola npm tarafından komut satırına yansıtıldığı ve shell geçmişine düştüğü için önerilmez. Ardından `http://localhost:3000/admin/login` adresinden giriş yapılır. Ayrıntılar için [Geliştirici Kılavuzu](docs/DEVELOPER_GUIDE.md) kullanılmalıdır.

## Gizli Veriler ve Repository Hijyeni

- `.env*` dosyaları (`.env.example` hariç) commit edilmez; `.env.example` yalnız boş şablon değerler içerir.
- `local.db`, tüm `*.db`/`*.sqlite*` dosyaları, test sırasında üretilen `.phase10-*.db` disposable veritabanları ve `.local-backups/` `.gitignore` ile dışlanır.
- Secret değerlerine `NEXT_PUBLIC_` prefix'i verilmez; tüm credential'lar yalnız server-side okunur.
- Yerel editör/araç yapılandırma klasörleri, build çıktıları (`.next/`) ve log dosyaları commit edilmez.
- Güvenlik modeli ve bilinen kabul edilmiş riskler için [docs/SECURITY.md](docs/SECURITY.md).

## Güvenlik Yaklaşımı

- Her `/admin` sayfası ve 40 admin API handler'ı sunucu tarafında admin oturumu/rolü doğrular; public kayıt kapalıdır, rol yükseltme engellenir.
- Admin, auth ve PDF yanıtları `Cache-Control: no-store` ile döner; admin JSON gövdeleri 1 MiB ile sınırlıdır.
- İstemciye yalnız genel hata mesajları döner; stack trace, SQL veya depolama ayrıntısı sızdırılmaz.
- CSP, `X-Frame-Options`, `nosniff`, origin ve rate-limit kontrolleri; R2 upload'ları imzalı token ve finalize doğrulamasıyla korunur.

## Doğrulama

```bash
npm run lint
npm run typecheck
npm test
npm run test:security
npm run test:cv:http
npm run build
npm audit --omit=dev
npm audit --audit-level=low
node tests/local-regression.mjs
```

`npm run typecheck`, Next.js'in ürettiği route/layout tiplerini (`next typegen`) oluşturup ardından `tsc --noEmit` çalıştırır; taze klonda düz `tsc` bu tipler olmadan hata verir. `npm run build` yerel dosya veritabanıyla derlenir, ancak `npm start` (production modu) güvenlik gereği yerel `file:` veritabanını reddeder ve uzak Turso ister; yerel kullanım için `npm run dev` kullanılır.

`tests/local-regression.mjs` tam HTTP regresyonudur: ayrı bir `.phase10-<timestamp>.db` oluşturup migrate eder, geçici test admini bootstrap eder ve `localhost:3100` üzerinde izole bir dev sunucusuyla çalışır; `local.db` hedeflenmez. Yalnız security HTTP grubunu çalıştırmak için `TEST_GROUPS=phase5-http node tests/local-regression.mjs` kullanılabilir (`npm run test:security:http` çalışan bir sunucu ve test admin bilgileri bekler).

`npm audit --omit=dev` production bağımlılıklarını denetler ve 1.9.0'da 0 bulgu verir. Tam `npm audit`, yalnız lint araç zincirindeki (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`) development bağımlılığı uyarısını raporlar; `npm audit fix --force` `eslint-config-next`'i 14.x'e düşüreceği için bilinçli olarak uygulanmamıştır.

Güncel unit/HTTP/build sonuçları `docs/TEST_LOG.md` içindedir (1.9.0: unit 131/131, security unit 11/11, security HTTP 8/8, tam HTTP 140/140, yüklenen CV HTTP 16/16).

## Belgeler

- [Final Akademik Rapor](docs/FINAL_REPORT.md) — teslim edilecek DOCX/PDF rapor ve PPTX sunum: [deliverables/](deliverables/TESLIM_PAKETI_README.md)
- [Kullanım Kılavuzu](docs/USER_GUIDE.md)
- [Geliştirici Kılavuzu](docs/DEVELOPER_GUIDE.md)
- [Mimari](docs/ARCHITECTURE.md) ve [Güvenlik](docs/SECURITY.md)
- [Test Günlüğü](docs/TEST_LOG.md) ve [Kararlar](docs/DECISIONS.md)
- [Demo Akışı](docs/DEMO_SCRIPT.md), [Sunum Taslağı](docs/PRESENTATION_OUTLINE.md), [Konuşma Metni](docs/PRESENTATION_SPEAKER_NOTES.md) ve [Jüri Soru-Cevap](docs/JURY_QA.md)
- [Ekran Görüntüsü Planı](docs/SCREENSHOT_PLAN.md)
- [Final Durum](docs/FINAL_STATUS.md) ve [Deployment Planı](docs/DEPLOYMENT.md)

## Durum

Sürüm **1.9.0 — Yüklenen profesyonel CV birincil public CV.** Admin panelinden yüklenen profesyonel PDF ziyaretçinin "CV" bağlantısında (`/api/cv/pdf`) açılır; yükleme yoksa veya depolama okunamazsa yapılandırılmış veriden üretilen PDF yedek olarak sunulur. Web CV (`/cv`) ve ATS kontrolü korunur (ADR-095). Mevcut bir veritabanında bir kez `npm run db:migrate` gerekir. Sürüm geçmişi `docs/CHANGELOG.md` içindedir.

Proje yerel geliştirme ortamında çalıştırılıp test edilmiştir. Vercel production deployment, Turso cloud veritabanı ve production custom domain henüz yoktur; deployment planı `docs/DEPLOYMENT.md` içindedir.

## Bilinen Sınırlar

- Production deployment, custom domain, canlı HTTPS `Secure` cookie testi ve deployed CSP/HSTS doğrulaması bekliyor.
- R2 public erişimi şu an development amaçlı `r2.dev` adresiyle; production medya custom domain'i kurulmadı.
- Turso cloud migration/smoke yapılmadı; yerel veritabanı libSQL dosyasıdır.
- Production Lighthouse, fiziksel cihaz/Safari testi ve gerçek NVDA/VoiceOver testi yapılmadı.
- 2FA, password reset, CV versioning ve CV avatar upload kapsam dışında. Profesyonel CV için yalnız tek aktif PDF tutulur (sürüm geçmişi yok).
- Yüklenen CV otomatik testleri yerel S3 mock'u kullanır; gerçek R2 ile profesyonel CV yüklemesi admin panelinden yapılmış ve public `/api/cv/pdf` üzerinden doğrulanmıştır.
