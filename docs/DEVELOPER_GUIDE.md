# Geliştirici ve Yerel Kurulum Kılavuzu

Bu kılavuz projeyi yerel olarak kurmak, doğrulamak ve güvenlik sınırlarını koruyarak bakım yapmak içindir. Production cloud adımları için ayrıca `docs/DEPLOYMENT.md` kullanılmalıdır.

## 1. Gereksinimler

- Node.js 22.13+ (22.x) veya Node.js 24+; kilitli bağımlılıklar nedeniyle Node.js 20 desteklenmez
- npm
- Git isteğe bağlıdır; uzak repository zorunlu değildir
- Yerel geliştirme için yazılabilir bir klasör

## 2. Kurulum

```bash
npm ci
```

`package-lock.json` sürüm kontrolünde tutulur. Bağımlılıkları keyfi biçimde güncellemeyin; güncelleme sonrası test/build/audit çalıştırın.

## 3. Environment

`.env.example` dosyasını `.env.local` olarak kopyalayın. Gerçek değerleri commit etmeyin.

Temel değişkenler:

- `TURSO_DATABASE_URL`: local için `file:./local.db`
- `TURSO_AUTH_TOKEN`: local file veritabanında boş olabilir
- `BETTER_AUTH_SECRET`: en az 32 karakter, yüksek entropi
- `BETTER_AUTH_URL`: local için `http://localhost:3000`
- R2 değişkenleri: medya upload için (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`); boşsa upload pasif. Yalnız `npm run dev` altında `*.r2.dev` görselleri aynı-origin `/api/media/r2` uç noktasından servis edilir (Türk Telekom ağındaki TLS ara cihaz sorunu nedeniyle); production'da bu uç nokta 404 döner ve teslim doğrudan R2/custom domain üzerindendir.
- `GITHUB_USERNAME` ve `GITHUB_TOKEN`: opsiyonel, server-only

`NEXT_PUBLIC_` prefix'i hiçbir secret'ta kullanılmaz.

## 4. Local Turso/libSQL ve Migration

Local örnek:

```text
TURSO_DATABASE_URL=file:./local.db
BETTER_AUTH_URL=http://localhost:3000
```

Migration'ları uygulayın:

```bash
npm run db:migrate
```

Şema değişikliği gerekiyorsa önce `src/db/schema/` güncellenir, sonra:

```bash
npm run db:generate
npm run db:migrate
```

1.9.0 eklemeli bir migration içerir (`drizzle/20261015154218_phase19_uploaded_cv_pdf`: `cv_settings` tablosuna 4 nullable kolon). Mevcut bir veritabanında `npm run db:migrate` bir kez çalıştırılmalıdır; çalıştırılmadan public sayfalar ve Web CV çalışır, admin CV sayfası migration uyarısı gösterir.

Mevcut migration geçmişini yeniden yazmayın. Yeni feature Phase 9 feature freeze kapsamında değildir.

## 5. İlk Admin Bootstrap

Migration sonrasında güvenilir terminalde:

```bash
npm run auth:bootstrap -- --email admin@example.com --name "Admin" --role admin
```

Parola gizli prompt ile girilir. Production parolasını komut argümanına, `.env` dışı dosyaya veya shell history'ye yazmayın. Public signup kapalıdır.

## 6. Development Server

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır. Public sayfalar için veritabanının migrate edilmiş olması gerekir.

## 7. Testler ve Build

```bash
npm run lint
npm run typecheck
npm test
npm run test:security
npm run test:cv:http                # 1.9.0: yüklenen CV akışı, yerel S3 mock + disposable DB (port 3101)
node tests/local-regression.mjs     # tam HTTP regresyonu, disposable DB (port 3100)
npm run build
npm audit --omit=dev
npm audit --audit-level=low
```

`npm audit --omit=dev` production bağımlılıkları için 0 bulgu vermelidir. Tam audit'te görülen `braces` uyarısı yalnız lint araç zincirindedir; `npm audit fix --force` `eslint-config-next`'i 14.x'e düşüreceği için uygulanmamalıdır.

`test:cv:http` ve `local-regression` aynı izole `.next-test` derleme klasörünü kullanır; aynı anda çalıştırmayın. `test:cv:http` gerçek R2 yerine `tests/r2-mock-server.mjs` mock'unu `R2_TEST_ENDPOINT` ile kullanır; bu değişken production'da yok sayılır ve gerçek ortamda tanımlanmamalıdır. HTTP testleri çalışan bir disposable local libSQL ve ilgili seed dosyalarını gerektirir. `tests/phase2-http.mjs` ile `phase8-social-http.mjs` arasındaki betikler production verisi üzerinde çalıştırılmamalıdır. Cloud smoke betikleri yalnız kullanıcı açıkça deployment istediğinde ve `docs/DEPLOYMENT.md` koşulları sağlandığında kullanılmalıdır.

## 8. Proje Yapısı

| Yol | Sorumluluk |
| --- | --- |
| `src/app/` | App Router sayfaları, layout ve API Route Handler'ları |
| `src/components/` | Admin/public UI ve etkileşimli bileşenler |
| `src/features/` | Saf domain, doğrulama, güvenlik ve görünüm kuralları |
| `src/server/` | Auth, repository, HTTP yardımcıları, R2 ve public sorgular |
| `src/db/` | libSQL client ve Drizzle şeması |
| `drizzle/` | Değiştirilmeyen versioned migration geçmişi |
| `tests/` | Unit, security, HTTP, seed ve smoke betikleri |
| `docs/` | Mimari, güvenlik, kararlar, testler ve teslim belgeleri |

## 9. Temel Güvenlik İlkeleri

- Admin mutation'da `requireAdminMutation` benzeri ortak auth/origin sınırını koruyun.
- İstek nesnesini doğrudan update/insert etmeyin; Zod allowlist kullanın.
- Public repository fonksiyonu yalnız gerekli DTO alanlarını döndürsün.
- Taslak, gizli, private repository ve CV mahremiyet filtrelerini client'a bırakmayın.
- Tiptap raw HTML ve `dangerouslySetInnerHTML` eklemeyin.
- URL'leri internal path veya credentialsız HTTPS allowlist'inden geçirin.
- R2 credential ve GitHub token'ı server-only tutun.
- Hata yanıtlarında secret, stack veya cloud host bilgisi göstermeyin.

## 10. Yeni Modül Ekleme Kuralı

Phase 9'da yeni modül eklenmez. Gelecek bir bakım Phase'inde gerekiyorsa sırasıyla domain gereksinimi, şema/ADR, Zod input, server authorization, repository/public DTO, UI, unit+HTTP test ve dokümantasyon hazırlanmalıdır. Migration additive ve geriye uyumlu planlanmalı; public veri sızıntısı negatif test edilmelidir.

## 11. Dokümantasyon Kuralı

Davranış değişikliğinde en az `CHANGELOG.md`, `TEST_LOG.md` ve ilgili `ARCHITECTURE.md`, `SECURITY.md` veya `DECISIONS.md` bölümü güncellenir. Yapılmamış cloud testi yapılmış gibi yazılmaz. Kod ile belge çelişirse kod gerçeği ve çalıştırılmış test kanıtı esas alınır.

## 12. Yerel Teslim Temizliği

Teslim öncesi `.env*`, `*.db`, log, PID, credential scratchpad, `.next/` ve `node_modules/` dosyalarının pakete girmediğini doğrulayın. `.env.example` yalnız boş değerlerle dahil edilebilir. Commit/push yalnız kullanıcı kararıyla yapılır.

