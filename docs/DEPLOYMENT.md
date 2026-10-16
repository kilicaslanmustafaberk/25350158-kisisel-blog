# Production Deployment Rehberi

Son güncelleme: 15 Ekim 2026 (1.9.0) — ilk sürümü 26 Eylül 2026 (Phase 8)

> **1.9.0 durumu:** Production deployment **yapılmamıştır**; Vercel projesi, custom domain, canlı HTTPS ve Turso cloud kurulumu yoktur. Uygulama yalnız yerel ortamda çalıştırılmış ve test edilmiştir. R2 bucket'ı (1.8.3) gerçek ve yerel geliştirmede kullanılmaktadır; profesyonel CV PDF'i de bu bucket'ta `cv/<uuid>.pdf` olarak tutulur.

> **Durum:** Bu rehber Vercel + Turso + Cloudflare R2 hedefi için hazırlanmış,
> komutları kurulu Vercel CLI 59.15.1 ve güncel resmî dokümanlarla doğrulanmıştır.
> Ancak Phase 8'de proje sahibi sitenin **public'e çıkarılmamasına ve uzak repo
> oluşturulmamasına** karar vermiştir. Bu nedenle aşağıdaki bulut adımlarının
> hiçbiri (Vercel projesi/link, deploy, Turso veritabanı, R2 bucket, CORS,
> production admin, production smoke) **çalıştırılmamıştır**. Çalıştırılan ve
> çalıştırılmayan her madde `docs/TEST_LOG.md` içinde ayrı ayrı kayıtlıdır.
>
> **1.8.3 güncellemesi:** Cloudflare R2 bucket'ı oluşturuldu ve yerel
> development ortamından gerçek upload/render akışı doğrulandı. Public adres
> development amaçlı `r2.dev`'dir; production custom domain, Vercel deploy,
> Turso cloud ve production smoke hâlâ yapılmadı.
> Secret değerleri bu dosyada, issue'larda, ekran görüntülerinde veya build
> loglarında yer almaz.

## 1. Gereksinimler

| Servis | Rol | Phase 8 durumu |
| --- | --- | --- |
| Vercel | Next.js 16 hosting (Node.js runtime), HTTPS, environment variables, deployment rollback, runtime logs | CLI kurulu ve hesap oturumu açık; proje oluşturulmadı |
| Turso (libSQL) | İlişkisel veritabanı: içerik, Better Auth kullanıcı/oturum, rate-limit sayaçları | Oluşturulmadı |
| Cloudflare R2 | Proje/blog görsellerinin object storage'ı; S3 API ile presigned PUT, public delivery URL | 1.8.3: bucket oluşturuldu, yerelde gerçek upload doğrulandı; custom domain yok |
| GitHub REST API | Landing GitHub bölümü için public profil/repo verisi (server-side, 6 saat cache) | Local'de gerçek ağla test edildi |
| Better Auth | Tek admin için e-posta/parola oturumu; uygulama içinde çalışır, harici servis değildir | Local'de test edildi |

Araçlar: Node.js 24, npm, Vercel CLI (`npm i -g vercel`). Turso ve R2 kaynakları
dashboard üzerinden oluşturulabilir; Turso CLI bu makinede kurulu değildir.

## 2. Turso setup

1. Turso dashboard'da (veya Turso CLI ile) production veritabanını oluşturun.
2. Uygulama için tam yetkili token: `turso db tokens create <db>`.
3. Preview için salt-okunur token: `turso db tokens create <db> --read-only`
   (bkz. ADR-075). İsteğe bağlı `--expiration 7d` gibi süre verilebilir.
4. Veritabanı URL'si `libsql://` biçimindedir. URL içine kullanıcı adı/parola
   yazılmaz; token yalnız `TURSO_AUTH_TOKEN` olarak verilir. Uygulama bunu
   `src/server/env-core.ts` içinde zorunlu kılar (production'da `file:` ve
   localhost reddedilir).

Yedekleme: Turso'nun resmî dokümanına göre point-in-time recovery mevcut bir
veritabanını, planın saklama penceresi içinde yeni bir veritabanına geri yükler
(Free 24 saat, Developer 10 gün, Scaler 30 gün, Pro 90 gün):
`turso db create <yeni-db> --from-db <db> --timestamp <ISO-8601>`. Silinmiş bir
veritabanı PITR ile geri getirilemez. Bu projede ek otomatik backup kurulmamıştır.

## 3. R2 setup

1. Cloudflare dashboard → R2 → bucket oluşturun (ad kodda sabit değildir;
   `R2_BUCKET_NAME` ile verilir).
2. R2 → API Tokens → yalnız bu bucket için **Object Read & Write** izinli token.
   Account ID, Access Key ID ve Secret Access Key yalnız Vercel env'e girilir.
3. Public delivery:
   - Tercih edilen: Cloudflare zone'u olan bir alan adının medya alt alan adı
     (ör. `media.<alan-adı>`) bucket'a Custom Domain olarak bağlanır.
   - Geçici: bucket Settings → Public Development URL (`*.r2.dev`). Cloudflare
     dokümanına göre bu adres rate-limited ve development amaçlıdır; production
     final çözümü değildir (ADR-077).
4. `R2_PUBLIC_BASE_URL` build sırasında okunur: `next/image` remote pattern'i
   (yalnız `/projects/**` ve `/blog/**`) ve CSP `img-src` origin'i buradan
   üretilir. Değer değişirse yeniden build/deploy gerekir.

## 4. R2 CORS

Browser, presigned URL ile doğrudan R2 S3 API host'una PUT yapar. Bucket'a
yalnız aşağıdaki kural girilir (placeholder'lar gerçek origin ile değiştirilir;
local upload testi gerekmiyorsa localhost satırı silinir):

```json
[
  {
    "AllowedOrigins": ["https://<production-origin>", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

1.9.0 profesyonel CV yüklemesi aynı kuralla çalışır (`PUT`, `Content-Type: application/pdf`); ek CORS kuralı gerekmez. Ziyaretçi CV'yi R2'den değil `/api/cv/pdf` üzerinden aynı origin ile alır. Production'da `R2_TEST_ENDPOINT` **tanımlanmaz** (tanımlansa da yok sayılır). Finalize edilmemiş `cv/` nesneleri için bucket lifecycle kuralı önerilir.

Wildcard origin, GET/DELETE methodu veya `*` header kullanılmaz. Public GET
için CORS gerekmez (görseller `<img>`/`next/image` ile yüklenir). Presigned URL
her zaman `https://<account>.r2.cloudflarestorage.com` S3 API host'unu kullanır;
custom public domain upload endpoint'i olarak kullanılmaz. Kaynaklar:
[Configure CORS](https://developers.cloudflare.com/r2/buckets/cors/),
[Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/),
[Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## 5. Vercel project

```bash
vercel link          # proje oluşturur/bağlar; .vercel/ klasörü zaten .gitignore içinde
```

Framework preset Next.js; build komutu `npm run build`. Uzak Git entegrasyonu
zorunlu değildir; `vercel deploy` çalışma dizinini yükler.

## 6. Environment variables

Değerler Vercel dashboard (Project → Settings → Environment Variables) veya
kullanıcının kendi terminalinde `vercel env add <NAME> <environment>` ile girilir;
sohbete, dosyaya veya komut argümanına yazılmaz. Local'de secret'ları dosyaya
indirmek yerine `vercel env run -e production -- <komut>` tercih edilir.
`vercel env pull` kullanılırsa çıktı dosyası (`.env.local`) `.gitignore`'daki
`.env*` kuralıyla dışlanır; `git status` ile ayrıca doğrulanmalıdır.

| Variable | Development | Preview | Production | Secret? |
| --- | --- | --- | --- | --- |
| `TURSO_DATABASE_URL` | local `file:` DB | production DB URL | production DB URL | Hassas (secret değil) |
| `TURSO_AUTH_TOKEN` | — | **read-only** token | tam yetkili token | Evet |
| `BETTER_AUTH_SECRET` | local değer | production'dan **farklı** değer | benzersiz ≥32 karakter | Evet |
| `BETTER_AUTH_URL` | `http://localhost:3000` | production canonical origin | production canonical origin | Hayır |
| `R2_ACCOUNT_ID` | opsiyonel | verilmez | ✓ | Hassas |
| `R2_ACCESS_KEY_ID` | opsiyonel | verilmez | ✓ | Evet |
| `R2_SECRET_ACCESS_KEY` | opsiyonel | verilmez | ✓ | Evet |
| `R2_BUCKET_NAME` | opsiyonel | verilmez | ✓ | Hayır |
| `R2_PUBLIC_BASE_URL` | opsiyonel | ✓ (görsel gösterimi/CSP için) | ✓ | Hayır |
| `GITHUB_USERNAME` | opsiyonel | opsiyonel | opsiyonel (social link varsa gereksiz) | Hayır |
| `GITHUB_TOKEN` | — | — | opsiyonel, yetkisiz/read-only | Evet |

Bu tablo `.env.example` ve gerçek kod okumalarından (`src/server/env-core.ts`,
`src/server/storage/r2-env.ts`, `src/server/github/repository.ts`,
`next.config.ts`) türetilmiştir; başka değişken kullanılmaz.

## 7. Migration

Önce ne uygulanacağı incelenir: `drizzle/` altında iki versioned migration
vardır (`20260923164536_perfect_madelyne_pryor`, `20260923190657_phase4_cv_additions`);
Phase 5–8 şema değiştirmemiştir. Migration history değiştirilmez.

```bash
vercel env run -e production -- npm run db:migrate
vercel env run -e production -- node tests/phase8-turso-smoke.mjs
```

Smoke betiği salt-okunurdur: bağlantı, `SELECT 1`, migration journal sayısı ile
repository karşılaştırması, beklenen tablolar, `PRAGMA foreign_keys` ve
`foreign_key_check`, tek admin varlığı ve içerik satır sayıları. URL/token
yazdırmaz. Production'a fake içerik seed edilmez.

## 8. Admin bootstrap

```bash
vercel env run -e production -- npm run auth:bootstrap -- --email <admin-e-posta> --name "<Ad>" --role admin
```

`--password` bayrağı production'da **kullanılmaz**; CLI parolayı gizli prompt ile
sorar ve parola komut geçmişine/loglara düşmez. Tek-admin tasarımı korunur;
kullanıcı zaten varsa komut yeniden çalıştırılmaz.

## 9. Deploy

```bash
vercel deploy                 # preview
vercel deploy --prod          # production (preview sağlıklıysa)
```

Build hatası CSP/env validation/auth/TypeScript kontrolleri gevşetilerek
aşılmaz; `vercel inspect <url> --logs` ve `vercel logs <url>` ile incelenir.
Canonical URL kesinleşince `BETTER_AUTH_URL` aynı origin'e (path/slash yok)
güncellenip yeniden deploy edilir. Sitemap/robots dosyası projede yoktur;
metadata `metadataBase` kullanmaz, bu yüzden domain'e bağlı başka alan yoktur.

## 10. Smoke tests

```bash
PROD_BASE_URL=https://<origin> node tests/phase8-production-smoke.mjs
vercel env run -e production -- node tests/phase8-production-smoke.mjs          # + secret leak taraması
PROD_BASE_URL=https://<origin> node tests/phase8-production-smoke.mjs --admin   # gizli prompt ile giriş, cookie attribute'ları
PROD_BASE_URL=https://<origin> node tests/phase8-production-smoke.mjs --rate-limit
vercel env run -e production -- node tests/phase8-r2-smoke.mjs                   # PROD_BASE_URL ile birlikte
```

- Production smoke: public route 200, CSP/HSTS/nosniff/frame/referrer/permissions,
  `X-Powered-By` yok, `/admin` redirect, anonim mutation 401, signup kapalı,
  404 sayfalarında tek header, PDF (200 `%PDF` veya CV yoksa generic 404 JSON),
  GitHub bölümünün server-render edilmesi, HTML ve client JS'te secret adı/değeri
  için yalnız eşleşme sayısı. `--admin`: HTTPS login, `Secure`/`HttpOnly`/
  `SameSite=Lax`/`Path=/`/expiry, `/admin` 200, cross-origin 401, sign-out.
  `--rate-limit`: var olmayan bir hesapla 6 deneme (gerçek admin hedeflenmez).
- R2 smoke: DB'ye satır yazmadan `projects/smoke-tests/<uuid>.webp` üzerinde
  presign (S3 host, 300 s, imzalı Content-Type) → CORS preflight (site origin
  izinli, yabancı origin değil) → yanlış Content-Type reddi → PUT → HEAD →
  magic-byte → public GET → production `/_next/image` → silme + HEAD 404.

## 11. Security verification

Deploy sonrası kontrol listesi (hepsi smoke betiklerinde otomatik):

- [ ] Production CSP `/`, `/projects`, `/blog`, `/cv`, `/admin/login` üzerinde;
  `unsafe-eval` ve wildcard yok; browser console'da CSP ihlali yok.
- [ ] HSTS tam olarak `max-age=31536000` (includeSubDomains/preload yok, ADR-040).
- [ ] Session cookie `Secure; HttpOnly; SameSite=Lax; Path=/` ve max-age.
- [ ] Client asset'lerinde secret adı/değeri 0 eşleşme.
- [ ] Draft/unpublished/private repo/gizli e-posta-konum public yanıtlarda yok
  (içerik yoksa local entegrasyon testleri geçerlidir).
- [ ] Preview deployment'ta admin login çalışmıyor (ADR-076) ve Preview DB token'ı
  salt-okunur.

## 12. Rollback

- Uygulama: Vercel dashboard → Deployments → önceki sağlıklı deployment →
  "Promote to Production" / "Instant Rollback" (veya `vercel rollback`).
- Veritabanı: otomatik down-migration yoktur. Mevcut migration'lar additive
  olduğundan önceki uygulama sürümü yeni şemayla çalışabilir; veri hatasında
  Turso PITR ile yeni bir veritabanına geri yükleme yapılıp `TURSO_DATABASE_URL`
  güncellenir.
- Medya: R2 object'leri deployment'tan bağımsızdır; rollback medya silmez.
  Orphan object'ler manuel raporlanıp silinir.

## 13. Troubleshooting ve hata modları

Aşağıdaki davranışlar local production build (`next start`) ile, erişilemeyen
dummy bir libSQL adresi kullanılarak 26 Eylül 2026'da ölçülmüştür:

| Durum | Davranış | Sızıntı kontrolü |
| --- | --- | --- |
| Turso erişilemez | `/`, `/projects`, `/cv` HTTP 500 genel Next.js hata sayfası; `/api/cv/pdf` 500 generic JSON; `/admin/login` statik 200; sign-in 500 (boş gövde); anonim admin mutation 401 | Yanıtlarda `libsql`, `turso`, host adı, stack: 0; server log'unda dummy token/secret: 0 |
| R2 erişilemez | presign/finalize `serverError` ile generic 500 JSON; log'a yalnız hata tipi | Kod incelemesi (bulut testi yapılmadı) |
| GitHub erişilemez | Landing yalnız "Profili görüntüle" bağlantısı; 10 dk backoff | Phase 7'de gerçek 404 ile test edildi |
| Env eksik/yanlış | `env-core` açık mesajla başlatmayı reddeder (secret değeri yazmaz) | Phase 5 unit testleri |

Log'lar: Vercel Runtime Logs yeterlidir; yeni gözlemlenebilirlik servisi
eklenmemiştir. Uygulama log'ları yalnız bağlam etiketi + hata tipi yazar.

## Operasyon

- R2 orphan media otomatik silinmez; R2 listesi ile DB `storage_key` değerleri
  karşılaştırılıp önce raporlanır, sonra manuel silinir.
- Parola reset e-posta akışı yoktur; kurtarma güvenilir terminalde Better Auth
  CLI ile yapılır.
- Secret rotasyonunda yeni değer deploy edilip oturum etkisi değerlendirildikten
  sonra eski değer kaldırılır; auth secret rotasyonu mevcut oturumları geçersiz kılar.
