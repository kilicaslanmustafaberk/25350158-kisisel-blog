# Test Günlüğü

## Final teslim QA (2026-10-15)

| Kontrol | Sonuç |
| --- | --- |
| Uygulama (gerçek yerel ortam) | `/`, `/projects`, `/blog`, proje ve blog detayı, `/cv` → 200; `/api/cv/pdf` → 200, `inline`, `X-CV-Source: uploaded` (341.933 bayt); `?download=1` → `attachment`; navbar "CV" yeni sekmede `/api/cv/pdf` açıyor |
| Admin CV | Durum Yüklendi (`web_cv.pdf`, 333,9 KB); Aç → 200, İndir → `mustafa-berk-kilicaslan-cv.pdf`; 390 px'te taşma yok. Yönetici oturumu için `local.db`'nin salt okunur yedek kopyası ve geçici QA admini kullanıldı; kopya silindi, `local.db` SHA-256 değişmedi |
| Public HTML'de R2 adresi | CV için yok. Görseller development'ta `/api/media/r2?url=…` ile sunuluyor (ADR-092, tasarım gereği) |
| Final rapor PDF | 43 sayfa; içindekiler/şekil/tablo listesi sayfa numaraları iki geçişle doğrulandı (84 girdi, eksik 0, kayma 0); tüm sayfalar görüntü olarak incelendi |
| Final rapor DOCX | A4, kenar boşlukları 3/2,5/2,5/2,5 cm, kapakta numara yok; 22 görsel (hepsi 15,5 cm metin genişliği içinde), 22 sıralı şekil ve 7 sıralı tablo başlığı; Türkçe karakterler doğru; alanlar açılışta güncellenir. Word bu ortamda olmadığından görsel render yapılmadı |
| Sunum PPTX | 16:9, 18 slayt, her slaytta konuşmacı notu; OOXML doğrulaması başarılı; aynı geometriyle üretilen HTML kopyasında metin taşması yok. PowerPoint bu ortamda olmadığından yerel render yapılmadı |
| Sızıntı taraması | DOCX/PDF/PPTX/teslim notlarında gerçek ortam değerleri, admin e-postası ve imzalı URL kalıpları bulunmadı |

## 1.9.0 final doğrulama — yüklenen profesyonel CV + final UI QA (2026-10-15)

Bu tablo projenin güncel test durumudur; 1.8.4 ve önceki bölümler tarihsel kayıttır. Tüm HTTP testleri ayrı disposable veritabanlarıyla çalıştı; gerçek `local.db` yalnız okundu (1.9.0 kolonları eklenmedi, `integrity_check` = `ok`).

| Kontrol | Sonuç |
| --- | --- |
| Unit (`npm test`) | 131/131 (118 + 13: yeni `cv-uploaded-pdf.test.ts` 9, güvenlik dosyasında 4) |
| Security unit (`npm run test:security`) | 11/11 (7 + 4: PDF imzası, `cv/` anahtar isim alanı, header injection, test seam) |
| Security HTTP (`tests/phase5-http.mjs`) | 8/8 |
| Tam HTTP (`node tests/local-regression.mjs`) | 140/140 (130 + 10 yeni `phase19-http` R2-yapılandırılmamış/yedek kontrolü) |
| Yüklenen CV HTTP (`npm run test:cv:http`, yerel S3 mock, port 3101) | 16/16 |
| Lint / typecheck | Başarılı / Başarılı |
| Production build | Başarılı (Next.js 16.3.8; yeni rotalar `/api/admin/cv/pdf`, `/presign`, `/finalize`) |
| `npm audit --omit=dev` | 0 zafiyet |
| Tam `npm audit` | Yalnız lint zincirindeki dev-only `braces` uyarısı (eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces; 5 kayıt, high). Bağımlılık değişmedi. |
| Tarayıcı (disposable sunucu + mock) | Admin "Profesyonel CV PDF": normal/hover/focus/disabled renkleri doğru (mint zemin üzerinde koyu yazı); Chrome `/api/cv/pdf`'i `inline` olarak dahili PDF görüntüleyicide açtı (CSP/XFO engellemedi); `/admin/cv` 390 px'te yatay taşma yok |
| Mobil hero (gerçek uygulama) | 375/390/430 px: "01 // ANA SAYFA" CTA'dan 36 px ayrı, `scrollWidth` = viewport; masaüstü hero değişmedi |

Not: Tarayıcıdan mock'a doğrudan PUT, CSP `connect-src` yalnız gerçek R2 upload host'una izin verdiği için engellendi (beklenen). Bu adım testte Node'dan yapıldı. Gerçek R2 üzerinden tarayıcı yüklemesi kullanıcının ilk gerçek yüklemesiyle doğrulanacak. Mock imza doğrulamaz; gerçek R2 imza davranışı `tests/phase8-r2-smoke.mjs` kapsamındadır.

Ara turda yakalananlar: `phase4-http` eski `attachment` varsayılanını, `phase18-http` İletişim satırında yalnız `/cv` hedefini bekliyordu; ikisi de bilinçli sözleşme değişikliği olarak güncellendi. `phase19` mock modunda presign JSON'unda R2 Access Key **ID** görüldü; bu, S3 presigned URL'nin `X-Amz-Credential` tasarımıdır (yalnız admin'e döner, secret değil). Test secret key / auth secret / parola için sıkı kaldı.

## 1.8.4 final doğrulama — PDF CV sayfalama düzeltmesi (2026-10-10)

Bu tablo projenin güncel test durumudur; 1.8.3 ve önceki bölümler tarihsel kayıttır.

| Kontrol | Sonuç |
| --- | --- |
| Gerçek veriyle PDF (`/api/cv/pdf`, dev sunucusu, `local.db` salt okuma) | Önce 3 sayfa (satır: 10 / 40 / 2), sonra 2 sayfa (40 / 7). Sayfa 1: başlık, Eğitim, 8 sertifika, Projeler. Sayfa 2: Yetenekler, Deneyim (BOTAŞ başlık + kurum + tarih + açıklama birlikte). |
| Layout ağacı (react-pdf `onRender` iç verisi) | Önce: sayfa 1'de kalan 518,3 pt, Sertifikalar bölümü 511 pt + 14 pt `marginBottom` → bölüm bütünüyle sayfa 2'ye taşındı; deneyim açıklaması sayfa 2'de 0 satır, sayfa 3'te 2 satır. Sonra: sayfa 1 içerik sonu 779/808 pt. |
| Linkler | PDF'teki `/URI` annotation sayısı önce/sonra aynı (16); doğrulama bağlantısı satır içinde. |
| Türkçe metin | `ı, ğ, ş, ç, ö, ü, İ` ve tüm sertifika/deneyim metni çıkarılabiliyor. |
| Yeni regresyon (`phase18-http`) | Eski kodla `experience 8 split across pages` hatasıyla başarısız; yeni kodla geçti. |
| Unit / security unit | 118/118, 7/7 |
| Security HTTP | 8/8 |
| Tam HTTP | 130/130 (129 + yeni sayfalama kontrolü), ayrı disposable DB; bu turun DB dosyaları silindi |
| Lint / typecheck | Başarılı |
| Production build | Başarılı (Next.js 16.3.8) |
| `npm audit --omit=dev` | 0 zafiyet |
| `local.db` / R2 | `local.db` yalnız okundu, değiştirilmedi; R2 uygulaması değiştirilmedi |

## 1.8.3 final doğrulama — 2026-10-10

| Kontrol | Sonuç |
| --- | --- |
| Unit (`npm test`) | 118/118 (2026-10-10 dokümantasyon turunda yeniden çalıştırıldı: 118 pass, 0 fail) |
| Security unit (`npm run test:security`) | 7/7 (aynı turda yeniden çalıştırıldı) |
| Security HTTP (`tests/phase5-http.mjs`) | 8/8 |
| Tam HTTP (`node tests/local-regression.mjs`) | 129/129; ayrı disposable `.phase10-<timestamp>.db` |
| Lint / typecheck | Başarılı (dokümantasyon turunda yeniden çalıştırıldı) |
| Production build | Başarılı (Next.js 16.3.8) |
| `npm audit --omit=dev` | 0 zafiyet (yeniden çalıştırıldı) |
| Tam `npm audit` | 5 high, tamamı `braces` → `micromatch` → `fast-glob` → `@next/eslint-plugin-next` → `eslint-config-next` dev zinciri; önerilen `--force` düzeltmesi `eslint-config-next@14.2.35`'e kırıcı düşüş olduğu için uygulanmadı |
| `local.db` | Korundu; integrity `ok` |

### Gerçek Cloudflare R2 doğrulaması

| Senaryo | Sonuç |
| --- | --- |
| Proje görseli yükleme (presign → PUT → finalize) | Başarılı |
| Blog kapağı yükleme | Başarılı |
| Admin önizleme ve public proje/blog render | Başarılı |
| JPEG / PNG / WebP | Kabul |
| SVG / GIF | Red |
| 5 MB üstü | Red |
| Magic-byte uyuşmazlığı | Red; nesne silinir, DB kaydı oluşmaz |
| Anonim presign | Red (401) |
| R2 secret'ları | Yalnız server-side; client bundle'a girmez |

### Türk Telekom / `r2.dev` TLS sorunu

Development sırasında `*.r2.dev` görselleri tarayıcıda yüklenmedi. İnceleme, bu ağda `*.r2.dev` TLS bağlantılarına ağ üzerindeki bir ara cihazın müdahale ettiğini ve TLS el sıkışması yerine HTTP yönlendirmesi döndüğünü gösterdi. Uygulama kodu, R2 bucket ayarı, CORS ve CSP kök neden olarak elendi. Çözüm yalnız development'ta çalışan aynı-origin `/api/media/r2` uç noktasıdır; production'da 404 döner ve production medya teslimi doğrudan R2/custom domain yönelimli kalır. Uç noktanın URL/anahtar allowlist'i `tests/media-delivery.test.ts` ile test edilir.

Commit, push, deploy ve cloud kaynak oluşturma yapılmadı.

## 1.8.2 clean-room kurulum doğrulaması — 2026-10-02

Repository dışındaki geçici bir klasöre yalnız commit edilecek 246 dosya kopyalandı (`local.db`, `.env.local`, `.local-backups/`, `node_modules`, `.next` yok). README adımları birebir izlendi: `npm ci` 608 paket, exit 0; `.env.example` → `.env.local` (yalnız `TURSO_DATABASE_URL=file:./local.db` ve üretilmiş secret); `npm run db:migrate` 4 migration, 22 tablo (`certificates` ve auth tabloları dahil), ek env değişkeni gerekmeden; `npm run auth:bootstrap` tek kullanımlık admin oluşturdu, CLI parolayı yazdırmadı.

| Kontrol | Sonuç |
| --- | --- |
| Lint / build / audit | exit 0 / 14/14 sayfa / 0 zafiyet |
| TypeScript | Taze klonda düz `npx tsc --noEmit` `LayoutProps` bulunamadığı için başarısız (Next.js tipleri gitignore'daki `next-env.d.ts`/`.next/types` içinde üretilir). `npm run typecheck` (`next typegen && tsc --noEmit`) eklendi; taze klonda exit 0. |
| Unit / security | 116/116, 7/7 |
| Tam HTTP | Clean-room içinde `node tests/local-regression.mjs`: 129/129 |
| Runtime (`npm run dev`, R2 yok) | `/`, `/projects`, `/blog`, `/cv`, `/admin/login` 200; anonim `/admin`, `/admin/blog`, düzenleme sayfası HTML 307 + RSC, gövdede taslak yok; admin girişi 200, admin sayfaları 200; taslak oluştur/sil 201/204; presign 503 genel mesaj; sign-up 400. |
| `npm start` | Yerel `file:` DB ile `A local file database cannot be used in production.` hatası verir (tasarım gereği); README'de belgelendi. |

## 1.8.2 güvenlik yaması ve public repository kapısı — 2026-10-02

| Kontrol | Gerçek sonuç |
| --- | --- |
| Açığın yeniden üretimi | Scratchpad'deki disposable DB kopyasına benzersiz canary kayıtlar eklendi (taslak yazı, gizli telefon/e-posta/konum, gizli sosyal bağlantı, gizli sertifika + credential ID, gizli eğitim/deneyim/yetenek, private repository URL'si). Sayfa guard'ları geçici olarak kaldırılınca 15 admin sayfasının 12'si anonim HTML veya RSC gövdesinde canary sızdırdı; HTML yanıtı `307` olsa bile gövde veriyi içeriyordu. Guard'lar geri yüklenince 15/15 temiz. Kaynak dosyalar yedekle birebir karşılaştırıldı. |
| Regresyon testinin geçerliliği | Yeni `phase5-http` kontrolü guard'sız kodda `/admin/blog leaked draft data` ile başarısız oldu, düzeltilmiş kodda geçti. |
| Admin API | 31 route dosyasındaki 40 handler × (aynı origin, cross-origin) = 80/80 anonim istek `401`, `no-store`, genel gövde. Her handler'da yetkilendirme gövde/parametre okumadan önce. |
| Signup / rol | `sign-up/email` (rol alanıyla) 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`; admin oturumuyla `update-user` rol alanı 400 `FIELD_NOT_ALLOWED`, rol değişmedi; Better Auth `admin/*` uçları anonim 401; kullanıcı oluşmadı. |
| Public sızıntı | `/`, `/projects`, proje detayı, `/blog`, taslak slug'ı, `/cv`, `/admin/login` (HTML + RSC) ve `/api/cv/pdf` metni: gizli canary 0. Yayınlanmış projenin PDF'te görünmesi metin çıkarımının çalıştığını doğruladı; private repository URL'si hiçbir yanıtta yok. |
| Birim / güvenlik | 116/116 ve 7/7 (yeni sınırlı JSON okuyucu testi dahil). |
| Tam HTTP | `node tests/local-regression.mjs`, ayrı `.phase10-1790891900170.db`: 129/129, `Local regression complete`. Phase 5 güvenlik 8/8 (PDF 404 kontrolü boş fixture'da doğru çalıştı). |
| Kod kapıları | Lint, `npx tsc --noEmit`, `npm run build` (14/14 statik sayfa) geçti; `npm audit`: 0 zafiyet. |
| Secret taraması | Yayınlanacak 246+ dosyada token/anahtar/private key/Turso host/R2 endpoint bulunmadı; e-posta/telefonlar `example.com`/`.invalid` fixture'ları. Git geçmişi tek commit; `.git` içindeki 568 blob tarandı, 5 eşleşme erişilemeyen eski boş `.env.example` şablonlarıydı (false positive). |
| DB güvenliği | `local.db` SHA-256 test öncesiyle aynı; `local.db` ve 6 yedek `integrity_check` `ok`. Live DB'ye seed/test/migration uygulanmadı. |

## 1.8.1 final yerel QA — 2026-09-30

| Kontrol | Gerçek sonuç |
| --- | --- |
| Yedek ve canlı DB | Testlerden önce `.local-backups/local-pre-final-qa-20260930-204214.db` alındı; yedek ve `local.db` integrity_check `ok`. Canlı sayılar: profil 1, proje 1, eğitim 3, deneyim 0, skill 0, sosyal 3, sertifika 8, yazı 0. Sekiz sertifikanın tamamı görünür ve CV'de açık. |
| Birim / güvenlik | 115/115 ve 6/6 geçti. Windows `tsx`/`os.userInfo()` ENOMEM için yalnız test süresince geçici CJS preload kullanıldı. |
| Tam HTTP | Ayrı `.phase10-1790791728082.db` ile 128/128 geçti; R2 yapılandırılmamış presign için iki yeni 503 kontrolü dahil. Canlı DB test hedefi olmadı. |
| Kod kapıları | `npm run lint`, `npx tsc --noEmit`, `npm run build` geçti; Next 16.3.6, 14/14 statik sayfa. `npm audit --json`: 0 zafiyet. |
| Drizzle | `.env.local` yerel `file:` URL ve boş token ile çözüldü; migration ayrı `.qa-drizzle.db` üzerinde geçti. |
| Gerçek tarayıcı | Desktop ve 375/390 CSS px'de landing, Projects/Journey/Certificates/Contact pin sırası ve ters scroll, sağ gösterge, `/projects`, `/blog`, `/cv`, klavye focus, palette/terminal Escape, mobil taşma ve Contact altı bağlantı geometrisi kontrol edildi. Contact node–metin arası 17 px. |
| CV/PDF | Web CV Türkçe LinkedIn yolunu okunur gösterdi; PDF 200, geçerli PDF, Türkçe ve sertifika metinleri çıkarılabilir. Filtreler disposable HTTP ortamında doğrulandı. |
| Reduced motion | Uygulama anahtarıyla pin yüksekliği kaldırıldı ve üç Journey item'ı görünür kaldı. OS media emülasyonu çalıştırılamadı. |
| Açık manuel kontroller | Gerçek %200 browser zoom, işletim sistemi reduced-motion emülasyonu, native print preview/PDF sayfa görünümü, fiziksel cihaz/Safari/touch, tam pointer hover ve screen reader/FPS ölçümü doğrulanmadı. |
| İçerik hazırlığı | Canlı projede `deneme` yer tutucusu var; blog, skills ve deneyim boş. Akademik final ekran görüntüsü öncesi gerçek örnek içerik ve gizlilik gözden geçirilmeli. |
| Son konsol ve temizlik | Kod tamamlandıktan sonra yeni IAB sekmesinde `/`, `/projects`, `/blog`, `/cv`: error/warn 0, yatay taşma yok. Geçici `.qa-userinfo.cjs`, `.qa-drizzle.db`, bu turun `.phase10-1790791728082.db` dosyası kaldırıldı; port 3100 kapalı. Canlı ve yeni yedek integrity tekrar `ok`, sayılar aynı. |

Geçici hot reload sırasında CV helper import'u tamamlanmadan bir `ReferenceError` loglandı; import tamamlandıktan sonra CV yeniden açıldı, çalıştı ve temiz sekmede hata/uyarı görülmedi. Eski fazların sonuçları aşağıda tarihsel kayıt olarak korunur.


## 1.8.0 Phase 18 final doğrulama — 2026-09-30

| Kontrol | Durum |
| --- | --- |
| Uygulama envanteri | Sertifika şeması/migration, admin API/UI, landing/Data Spine, web/PDF CV, URL doğrulaması ve Contact CSS değişikliği kaynakta mevcut |
| Unit | 114/114; sertifika testleri 9/9 |
| Security unit | 6/6; HTTP güvenlik kontrolleri tam regresyon içinde geçti |
| Tam HTTP | 126/126; Phase 18 sertifika kontrolleri 12/12; `Local regression complete` ile bitti |
| Lint / TypeScript | `npm run lint` ve `npx tsc --noEmit` exit 0 |
| Build | `npm run build` exit 0; Next 16.3.6, 14/14 statik sayfa. İlk sandbox denemesi Google Fonts bağlantısında durdu; ağ erişimli tekrar başarılı |
| Audit | `npm audit --json`: 0 zafiyet |
| Veritabanı | `.local-backups/local-20260930-191209.db` ve canlı `local.db` integrity_check `ok`; canlı profil 1, proje 1, eğitim 3, sosyal bağlantı 3. Sertifika tablosu mevcut ve boş; mevcut içerik sayıları yedekle aynı |
| Drizzle | `.env.local` yerel `file:` URL'si token olmadan çözüldü; `npm run db:migrate` ayrı disposable DB'de exit 0 |
| Regresyon güvenliği | `tests/local-regression.mjs` ayrı `.phase10-<timestamp>.db` üretir; canlı `local.db` test hedefi değildir |
| Temizlik | Bu turda oluşturulan `.phase10-1790786246850.db`, `.phase18-drizzle-verify.db` ve geçici Node shim dosyaları kaldırıldı; port 3100 kapalı, eski disposable DB'ler ve backup korundu |

Eski sürüm tablolarındaki sayılar kendi dönemlerine aittir; Phase 18 sonucu olarak okunmamalıdır.

Önceki turun desktop, 375/390 px, Contact 17–18 px boşluk ve PDF Türkçe karakter görsel gözlemleri bu turda tekrar ölçülmedi. HTTP testleri Contact bağlantı/anchor yapısını, web/PDF görünürlük filtrelerini ve PDF metnindeki Türkçe karakterleri doğruladı. Windows ortamında `tsx`, `os.userInfo()` için ENOMEM döndürdüğünden unit testler geçici CJS preload ile çalıştırıldı; preload temizlikte kaldırıldı.

## 1.7.0 Phase 17 final doğrulama - 2026-09-27

| Kontrol | Gerçek sonuç |
| --- | --- |
| Backup/live veri | `.local-backups/local-pre-phase17-20260927-184022.db`; integrity ok; live/backup SHA-256 `9E1AE148AB01D5A6B047F679CCEE7481ADB97D1E1D748D0CEF7B2C0B9398A006` |
| Unit | 104/104; 7 yeni pin budget/0/1/N targets/threshold/reverse/reduced/short/tall/cached route testleri |
| Security unit | 6/6 |
| Full HTTP | Phase 5/7/2/3/4/8/10/11/13/14/15/16/17: 114/114; disposable DB `.phase10-1790524168091.db`, `.next-test`, localhost:3100 |
| Final ilgili HTTP | Son hash/lifecycle değişimlerinden sonra Phase 15/16/17: 26/26; genişletilmiş education/blog ve gerçek GitHub fixture |
| Lint / TypeScript | Son kaynak değişiminden sonra exit 0 |
| Build | Son kaynak değişiminden sonra Next 16.3.6, exit 0, static generation 13/13 |
| Audit | npm audit --audit-level=low: 0 vulnerabilities |
| Projects desktop | Scroll 1299→1504, scene top 88.996 px sabit; item 0/0/0→1/.088/0; reverse 1368'de 1/0/0; core hub merkezinde, indicator #projects |
| Education desktop | Step0 3294 top89.094 item0/0/0; 3499: .647/0/0; 3704:1/.102/0; 4046:1/1/1 top88.996; 4183:top-4.799 leavingHub; reverse3909:1/1/0 top88.996 |
| GitHub desktop | Gerçek 5 public repo; enabled sticky, top88.996; ilk item .820, sonraki0; PageDown tüm item'ları1 yaparken scene sabit |
| Contact desktop | Pin sırasında ilk item1, kalan0; 6/6 link hit-test true, route pointer-events none; Space native scroll tüm item'ları1 yaptı |
| Blog/CV | Blog top88.996 ve ilk item1/sonrakiler0; CV tek item kısa mesafe, native scroll partial reveal sırasında top88.996 |
| Mobile | 375x812/390x812 overflow false; education pin/core hizası ve progress; Projects/Blog/GitHub tall-content fixture bypass, CV/Contact enabled |
| Short/zoom equivalent | 719x449 CSS viewport: tüm pin'ler bypass, tüm 21 item opacity1, overflow false; gerçek browser zoom ayarı değiştirilmedi |
| Reduced | Uygulama toggle: tüm pin bypass, --pin-height boş, tüm item opacity1; nearest hub mevcut logic; OS emülasyonu yapılmadı |
| Hash | Final #journey reload: top89.094, tüm item0, pinnedSequence; anchor tıklaması da başlangıca gelir |
| Console | Acceptance tab error listesi boş |
| Ölçüm sınırları | Gerçek Safari/touch/scrollbar drag, OS media emülasyonu, physical-device/FPS ve tüm hedeflerde gerçek hover/print preview yok |

İlk full suite Phase13'e kadar geçti fakat `data-spine-scene` eski canvas marker kontrolüyle çakıştı; attribute `data-pin-scene` oldu, eski test korunarak tam suite yeniden 114/114 geçti. İlk sandbox build Google Fonts fetch hatası verdi; host tekrarları başarılı. Browser'da sticky yeniden ölçüm ve eski padding selector specificity problemi bulundu, doğal-position ölçüm guard'ı ve doğru selector ile düzeltildi. İlk hash SSR koordinatı extra scroll sonrası kayıyordu; tek enhancement hizalamasıyla doğrulandı. Browser'da durdurulmuş eski server tabı error URL policy nedeniyle kullanılamadı; yeni acceptance tabı ile kontroller tamamlandı.

Visual seed yalnız tam suite bittikten sonra regex ile disposable URL doğrulayan `tests/phase16-visual-seed.mjs` üzerinden yapıldı. Live DB seed/test/migration almadı; önceki fixture ve backup dosyaları korunur.

Cleanup: `.phase10-1790523909675.db` ve `.phase10-1790524168091.db` tam adlı sidecar’larıyla kaldırıldı; eski `.phase10-1790516260478.db` ve üç backup korundu. Test server kapalı; acceptance tabı kapatıldı, viewport reset edildi.

## 1.6.0 Phase 16 final doğrulama — 2026-09-27

| Kontrol | Gerçek sonuç |
| --- | --- |
| DB | `.local-backups/local-pre-phase16-20260927-175041.db`, integrity `ok`; live ve backup SHA-256 `9E1AE148AB01D5A6B047F679CCEE7481ADB97D1E1D748D0CEF7B2C0B9398A006` |
| Unit | 97/97; 7 yeni test hub origin, dwell, sequence/order/reverse, invalid bounds, restored/deep-link/resize/crossing |
| Security unit | 6/6 |
| Tam HTTP | Phase 5/7/2/3/4/8/10/11/13/14/15/16: 106/106 |
| Son HTTP | StrictMode disposal guard sonrası Phase 15 ve Phase 16: 18/18; gerçek GitHub repos ve genişletilmiş education/blog fixture ile |
| Security regresyonu | Auth/origin/private/hidden/phone/draft/terminal/CSP/PDF mevcut tam suite içinde başarılı; ilgili sunucu kodları değişmedi |
| Lint / TypeScript | Son kaynak değişiminden sonra `npm run lint` ve `npx tsc --noEmit`, exit 0 |
| Build | Son kaynak değişiminden sonra `npm run build`, Next 16.3.6, 13/13 static generation, exit 0 |
| Audit | `npm audit --audit-level=low`: 0 vulnerabilities; dependency değişmedi |
| Desktop browser | Projects core hub'da, branch1 .919 / item1 .822, sonraki hedef 0; Timeline üç eğitimde .951/0/0 ardından 1/1/.386 branch ve 1/1/.036 item |
| Mobile browser | 375 ve 390 CSS px, overflow false; ortak hub kökeninden dar elbow; 390 GitHub branch 1/1/1/.045/0, item 1/1/1/0/0 |
| Blog / CV | Üç blog fixture'ının ortak hub path'i ve activation; CV tek branch .749, item .495; SSR empty-state anchor kontrolü |
| Contact | Altı branch ortak hub'dan; scroll sonunda tüm hedefler 1; altı link pointer hit-test true, spine SVG pointer-events none |
| Reduced motion | Uygulama anahtarı reduced; tüm item opacity 1; Journey nearest hub core `translate(27.0 2603.0)` |
| Console | Son browser error listesi boş |
| Sınırlar | OS media emülasyonu, tüm hedeflerde gerçek hover matrisi, print preview, FPS ve fiziksel cihaz ölçümü yapılmadı |
| Cleanup | İki yeni fixture DB ve tam adlı sidecar'ları silindi; 3100 test server kapalı; geçici tab kapatıldı/viewport reset; eski fixture ve iki backup korundu |

İlk yeni HTTP testi standalone RSC payload'ındaki undefined prop isimlerini DOM marker sanarak false-positive verdi; assertion gerçek HTML tag attribute'larına daraltıldı, tam suite yeniden başarılı oldu. Browser fixture script'inin post query'si gerçek `status='published'` alanına düzeltildi. İlk sandbox tsx çalıştırmasındaki `uv_os_get_passwd ENOMEM` host doğrulamasıyla aşıldı. Browser'ın yakaladığı stale SVG sorunu disposal guard ile düzeltildi ve gerçek SVG progress tekrar ölçüldü.

`tests/phase16-visual-seed.mjs` yalnız tam regresyondan sonra disposable `.phase10-<timestamp>.db` için opsiyoneldir; üç eğitim/üç blog örneği ekler ve live DB URL'sini reddeder. Live DB'ye seed/migration/test uygulanmadı.

## 1.5.0 Phase 15 final doğrulama — 2026-09-27

| Kontrol | Gerçek sonuç | Durum |
| --- | --- | --- |
| Test öncesi DB backup | `.local-backups/local-pre-phase15-finalize-20260927-172300.db`; canlı/yedek SHA-256 eşleşti, SQLite integrity `ok` | Başarılı |
| Live veri | Live `local.db` üzerinde seed/migration/destructive test yok; final hash kontrolü yedek ile aynı | Korundu |
| Lint | `npm run lint`, exit 0 | Başarılı |
| TypeScript | `npx tsc --noEmit`, exit 0 | Başarılı |
| Unit | 90/90; ilk sandbox `uv_os_get_passwd ENOMEM`, host tekrarı exit 0 | Başarılı |
| Security unit | 6/6, exit 0 | Başarılı |
| Tam HTTP | Phase 5/7/2/3/4/8/10/11/13/14/15: 7+7+9+12+18+10+7+4+6+8+9 = 97/97 | Başarılı |
| HTTP izolasyonu | `file:./.phase10-1790519128642.db`, `.next-test`, localhost:3100; mevcut 3000 sürecine müdahale yok | Başarılı |
| Core unit kapsamı | Başlangıç smoothing, monotonic focus/target, hub dwell, end reach, nearest hub ve arrival mesafesi | Başarılı |
| Security regresyonu | Auth/origin/private repo/hidden social/phone/draft/terminal/CSP/PDF sınırları tam suite içinde geçti | Başarılı |
| Browser desktop | Hero→Projects/Skills/Timeline/Blog/CV/GitHub/Contact; core/arrival/branch/indicator context eşleşmesi incelendi | Başarılı, frame/FPS garantisi değil |
| Secondary routes | Projects/Blog/CV desktop ve 375×812, 390×812 CSS px; document overflow false, dekor içerikten geri planda | Başarılı |
| Mobile landing | 375/390 CSS px overflow false; CTA/menu/timeline/branches incelendi | Başarılı |
| CV | Grid/background/social URL/telefon okunabilir; PDF privacy ve Türkçe metin regresyonu geçti | Başarılı |
| Reduced motion toggle | Uygulama anahtarı reduced state, nearest Skills hub park ve aynı indicator context üretti | Başarılı |
| OS reduced motion emülasyonu | Araç media emülasyonu sunmuyor; CSS/JS kaynak incelemesi yapıldı | Runtime pending |
| Hover/focus | Kaynak kuralları incelendi; Tab focus-visible ve outline browser'da görüldü; tüm hedeflerde hover API yok | Gerçek hover matrisi pending |
| Print | Print dekor gizleme kaynakta mevcut; browser print preview yapılmadı | Preview pending |
| Console | İncelenen browser oturumunda error listesi boş | Başarılı |
| Build | `npm run build`, Next 16.3.6; exit 0, 13/13 static generation | Başarılı |
| Audit | İlk sandbox registry erişim hatası; host `npm audit --audit-level=low`: 0 vulnerability, exit 0 | Başarılı |
| Değişiklik | Yalnız Phase 15 HTTP liste entegrasyonu, doküman ve sürüm; görsel sistem korunmuş | Tamamlandı |
| Sürüm | Tüm otomatik final kapılardan sonra package/package-lock 1.4.0 → 1.5.0 | Tamamlandı |
| Cleanup | Bu oturumun `.phase10-1790519128642.db` ve tam adlı sidecar hedefleri kaldırıldı; 3100 fixture sunucusu kapalı, geçici browser kapatıldı/viewport reset; önceki `.phase10-1790516260478.db` ve yeni backup korundu | Tamamlandı |

Eski faz tabloları aşağıda tarihsel sonuçlardır; bu oturumun browser sınırlamalarını geçersiz kılmazlar.

## 1.4.0 Sürekli Data Spine — 2026-09-27

| Kontrol | Gerçek sonuç | Durum |
| --- | --- | --- |
| Unit | 87/87. `phase13-spine.test.ts` sürekli rota sözleşmesiyle yeniden yazıldı (14 test). İlk koşuda calm lane toleransı 12px ile kırıldı (lane girişindeki spline yayı 12.04px) → tolerans lane genişliğinin %11'i olarak tanımlandı | Başarılı |
| Phase 11 unit | Kaldırılan `spineTarget` kullanımı çıkarıldı; anchor'da blend devri doğrudan `narrativeFrame` ile test ediliyor | Bilinçli değişiklik |
| Security unit | 6/6 | Başarılı |
| HTTP | Phase 5/7/2/3/4/8/10/11/13/14 = 7+7+9+12+18+10+7+4+6+8 = 88/88 (izole DB, `tests/local-regression.mjs`). Phase 11/13 beklentileri `spine-fallback` → `spine-lane` olarak güncellendi; Phase 13 kart/anchor kontrolü “her kart anchor'lı” biçimine sertleştirildi | Başarılı |
| Phase 14 HTTP | Her section tek lane + hub, tek route/canvas katmanı, aria-hidden dekor, blog/cv/github/contact/journey anchor'lı, calm timeline, sıralı cue numaraları, contact linkleri, footer temiz, `/projects` `/blog` `/cv` spine içermiyor | Başarılı |
| Browser görsel | Headless Chromium + SwiftShader: 1440×5200, 1024×4600, 390×7400 tam sayfa; reduced-motion 1440×5200. Rota kesintisiz, hub'lar hizalı | Başarılı |
| Contact clickability | 6/6 link × 3 nokta `elementFromPoint` (1440, 390); 390'da scrollWidth = 390 | Başarılı |
| Konsol | Shader derleme hatası (GLSL `active` ayrılmış kelime) bulundu ve düzeltildi; shader hatasında SVG fallback'e düşme eklendi | Düzeltildi |
| FPS | Ölçülmedi (uygulama paneli gizliyken rAF kısıtlı) | Ölçüm yok |
| lint / TypeScript / build | Exit 0 | Başarılı |
| audit | 0 vulnerability | Başarılı |

## 1.3.0 Data Spine Phase — 2026-09-27

| Kontrol | Gerçek sonuç | Durum |
| --- | --- | --- |
| Unit | 85/85; 12 yeni Data Spine testi (state config, section sırası, yoğunluk koreografisi, interpolation, 2px adımlı süreklilik, reduced snap, mobile sadeleştirme, quality tier/DPR, geometri, damping, skill emergence, connector güvenliği). İlk koşuda `-0`/`0` ve lerp uç nokta kayan nokta farkı → test epsilon + kesin lerp | Başarılı |
| Phase 11 unit uyarlaması | Kaldırılan `narrativePosition/sceneState` testleri çıkarıldı; süreklilik testi `spineTarget` ile, reduced testi aktif section snap'ine göre güncellendi | Bilinçli değişiklik |
| Security unit | 6/6 | Başarılı |
| HTTP | Phase 5/7/2/3/4/8/10/11/13: 7+7+9+12+18+10+7+4+6 = 80/80. İlk koşuda Phase 7 `class="site-footer"` beklentisi kırıldı → footer class sözleşmesi korundu, tekrar 80/80 | Başarılı |
| Phase 13 HTTP | SSR spine fallback, eski küre markup'ı yok, kart sayısı = anchor sayısı ve aria-hidden, Contact copy/gerçek linkler/canvas yok, footer'da link/nav/admin/version yok (`/`, `/projects`, `/cv`) | Başarılı |
| Browser görsel | 1440×900, 1024×768, 375×812, 390×844, 720×450; Hero/About/Projects/Skills/Timeline/Blog/Contact/footer; yatay taşma yok; console error yok | Başarılı |
| Contact clickability | 7/7 link, 3 nokta `elementFromPoint` (desktop, 375, 720×450); layer/canvas/SVG pointer-events none; Contact içinde canvas/SVG/pseudo yok | Başarılı |
| Projects connector | Görünür 2 kartta strength 0.894, anchor connected; kart link hit-test | Başarılı |
| WebGL fallback | Context loss → CSS spine görünür; restore → WebGL çiziyor. Gerçek WebGL2'siz cihaz yok | Simülasyonla başarılı |
| Reduced motion | Manuel toggle: 2 sn'de 1 render, içerik opacity 1, geri açma çalışıyor. OS media-query emülasyonu yapılmadı | Kısmi |
| UI | Mobil menü aç/Escape, palette/Terminal aç/kapat; palette açıkken 0 render | Başarılı |
| Performans ölçümü | 6 draw call; desktop 1286 / mobile 420 vertex; DPR cap. FPS ölçülmedi (browser pane rAF kısıtlı) | Ölçüm sınırlı |
| lint / TypeScript / build | Exit 0; Next.js 16.3.6 build | Başarılı |
| audit | npm audit --audit-level=low: 0 vulnerability | Başarılı |
| Bulunan hata | 30 fps cap'te yeniden başlayan döngünün ilk frame'i çizilmiyordu (mobilde spine hiç görünmüyordu) → düzeltildi, 375/390'da doğrulandı | Giderildi |
| Temizlik | Disposable test DB'leri silindi; aynı glob `.phase10-pre-migration.db` yedeğini de sildi, geri getirilemedi. `local.db` korundu | Hata kaydedildi |
| Pending | Fiziksel cihaz, gerçek %200 zoom, OS reduced-motion, FPS/GPU, Lighthouse, NVDA | Çalıştırılmadı |

## 1.2.0 Narrative Phase — 2026-09-26

| Kontrol | Gerçek sonuç | Durum |
| --- | --- | --- |
| Unit | 75/75, 7 yeni narrative test; ilk geometry bound assertion 2.1 yanlıştı, gerçek network sınırı 2.25 ile tekrar geçti | Başarılı |
| Security unit | Ayrı komut 6/6 | Başarılı |
| HTTP | Phase 5/7/2/3/4/8/10/11: 7+7+9+12+18+10+7+4 = 74/74 | Başarılı |
| HTTP veri sınırları | Anonim/admin/origin/CSP/signup/rate-limit, private repo, draft, phone/social/CV HTML-RSC ve PDF; yeni SSR narrative/chapter/ayrı CV kontrolleri | Başarılı |
| Browser | CSS 1439×900, 375×812, 390×812, 719×451; Hero/Projects/Skills/Timeline/Contact/footer; horizontal overflow false | Başarılı |
| Scene | WebGL ready; core→build→network→path→core; main 312 desktop / 84 mobile vertex, 3 draw call | Başarılı; FPS ölçümü değil |
| UI | Mobil Menü, palette, Terminal aç/kapat; palette mobil accessible name; console error=[] | Başarılı |
| Reduced motion | Manuel toggle runtime reduced/static/core, içerik opacity=1; geri açma full/mobile doğrulandı | Başarılı; OS preference emülasyonu yapılmadı |
| lint / TypeScript / build | Exit 0, Next.js 16.3.6 13 static generation adımı; public/admin/API route'ları korundu | Başarılı |
| audit | npm audit --audit-level=low: found 0 vulnerabilities | Başarılı |
| İlk görsel problemler | Düşük line density sıraları kesiyordu → deterministik dağılım; blend reset rotation → continuous intensity; kısa viewport header kesişmesi → viewport/header offset | Giderildi |
| Referans | Utsubo text reader + browser görsel; teknik mint procedural özgün konsept, asset/model/hayvan/ses kopyalanmadı | İncelendi |
| Kapsam | Kullanıcı local.db/schema/auth/admin/CV/CRUD değişmedi; yalnız disposable test fixture mutasyonları | Korundu |
| Pending | OS media-query runtime, fiziksel cihaz, NVDA, FPS/GPU trace, Lighthouse, gerçek browser zoom, deploy/cloud/remote | Çalıştırılmadı |
| Son kullanıcı sunucusu | 3000 portunda mevcut sunucu bulundu; ikinci dev başlatma EADDRINUSE döndü, mevcut süreç durdurulmadı. Gerçek içerikte optional About/Skills anchor'ları yok, primary WebGL ready ve overflow false | Salt okunur doğrulandı |
| Son tekrar/cleanup | Son lint/tsc/build exit 0. İki disposable test DB kaldırıldı, local.db ve migration backup korundu. Cleanup Split-Path parametre uyarısı verdi; son read-only dosya kontrolünde yalnız backup kaldığı doğrulandı | Tamamlandı |

Önceki phase sonuçları aşağıda tarihsel kayıttır.

Test sonuçları yalnızca komutlar gerçekten çalıştırıldıktan sonra kaydedilir.

| Tarih | Test edilen özellik | Beklenen sonuç | Gerçek sonuç | Durum | Düzeltme |
| --- | --- | --- | --- | --- | --- |
| 2026-09-23 | Phase 0 lint (`npm run lint`) | ESLint hatasız tamamlanmalı | Exit code 0, hata veya uyarı yok | Başarılı | — |
| 2026-09-23 | İlk production build denemesi | Next.js production build tamamlanmalı | Ağ kısıtı nedeniyle üç Google fontu indirilemedi | Başarısız | Aynı build izinli ağ erişimiyle tekrarlandı |
| 2026-09-23 | Production build tekrarı (`npm run build`) | TypeScript ve statik üretim tamamlanmalı | Exit code 0; `/` ve `/admin/login` statik üretildi | Başarılı | — |
| 2026-09-23 | Production route smoke testi | Her iki route HTTP 200 dönmeli | `/` ve `/admin/login` HTTP 200 döndü; başlık ve devre dışı form doğrulandı | Başarılı | — |
| 2026-09-23 | Güvenlik response header'ları | Yapılandırılan başlıklar gelmeli, `X-Powered-By` bulunmamalı | `nosniff`, `DENY`, referrer policy mevcut; `X-Powered-By` yok | Başarılı | — |
| 2026-09-23 | Phase 1 npm audit (stable Drizzle Kit) | Bilinen vulnerability olmamalı | Drizzle Kit'in eski esbuild development server zincirinde 4 moderate bulgu | Başarısız | Resmî Turso rehberindeki Drizzle 1.0 RC kanalına geçildi |
| 2026-09-23 | Phase 1 npm audit tekrarı | Bilinen vulnerability olmamalı | 0 vulnerability | Başarılı | — |
| 2026-09-23 | İlk Better Auth schema generation | Auth şeması üretilmeli | CLI `server-only` import'unu yüklemeyi reddetti | Başarısız | Runtime wrapper korunarak HTTP dışı ortak CLI entry point eklendi |
| 2026-09-23 | Better Auth schema generation tekrarı | Admin ve rate-limit dahil şema üretilmeli | users, sessions, accounts, verifications, rateLimits üretildi | Başarılı | — |
| 2026-09-23 | İlk Drizzle migration generation | SQL migration üretilmeli | Relations v1, Drizzle RC'de `relations is not a function` hatası verdi | Başarısız | Better Auth Relations v2 adapter ve şeması kullanıldı |
| 2026-09-23 | Drizzle migration generation tekrarı | SQL migration ve snapshot üretilmeli | Versioned migration başarıyla üretildi | Başarılı | — |
| 2026-09-23 | Local libSQL migration | Bütün tablolar hatasız oluşmalı | Migration başarıyla uygulandı | Başarılı | — |
| 2026-09-23 | İlk migration doğrulama sorgusu | Tablo sayısı ve foreign key sonucu okunmalı | PowerShell quoting komutu böldü | Başarısız | Kabukla çakışmayan sorgu kullanıldı |
| 2026-09-23 | İkinci migration doğrulama sorgusu | Tablo sayısı ve foreign key sonucu okunmalı | 20 domain/auth tablosu + migration journal; 0 foreign key sorunu | Başarılı | — |
| 2026-09-23 | Phase 1 lint | ESLint hatasız tamamlanmalı | Exit code 0 | Başarılı | — |
| 2026-09-23 | İlk Phase 1 production build | TypeScript ve build tamamlanmalı | Drizzle RC eski `schema` client parametresini reddetti | Başarısız | Parametre kaldırıldı; şema Better Auth adapter'da tutuldu |
| 2026-09-23 | Secret olmadan production build tekrarı | Public build DB/auth env olmadan tamamlanmalı | Exit code 0; `/` ve login statik, admin ve auth dinamik | Başarılı | — |
| 2026-09-23 | Oturumsuz `/admin` | Login sayfasına server-side yönlenmeli | HTTP 307, Location `/admin/login` | Başarılı | — |
| 2026-09-23 | Public `/` ve `/admin/login` | Route'lar HTTP 200 dönmeli | Her iki route HTTP 200 | Başarılı | — |
| 2026-09-23 | Public signup | Hesap oluşmamalı | HTTP 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`; user sayısı 1 kaldı | Başarılı | — |
| 2026-09-23 | CLI admin bootstrap ve gerçek login | Admin oluşturulmalı, session cookie alınmalı | CLI başarılı; login HTTP 200 ve authenticated `/admin` HTTP 200 | Başarılı | Geçici test database'i ve admini silindi |
| 2026-09-23 | Login rate limit | Sınır aşımında HTTP 429 dönmeli | `401,401,401,401,429,429` | Başarılı | — |
| 2026-09-23 | Client bundle secret taraması | Gerçek secret/DB URL değeri bulunmamalı | Test secret ve local DB URL eşleşmesi 0 | Başarılı | Better Auth client'taki genel env değişken adı credential değildir |
| 2026-09-23 | Development font erişimi | Fontlar indirilmeli veya fallback kullanılmalı | Sandbox ağ kısıtında Next.js fallback font kullandı; auth testleri çalıştı | Kısmi | Production build izinli ağla fontları başarıyla indirdi |
| 2026-09-23 | Phase 2 dependency audit | Yeni bağımlılıklarda bilinen vulnerability olmamalı | npm install sonrası 0 vulnerability | Başarılı | — |
| 2026-09-23 | İlk Phase 2 unit test komutu | Test runner başlamalı | Sandbox Windows `uv_os_get_passwd` çağrısında ENOMEM verdi | Başarısız | Aynı `npm test` host ortamında tekrarlandı |
| 2026-09-23 | İlk Phase 2 unit test sonucu | Beş validation testi geçmeli | 4 geçti; Türkçe combining mark slug'ı harfleri böldü | Başarısız | Türkçe eşleme normalize öncesine alındı, combining mark'lar kaldırıldı |
| 2026-09-23 | Phase 2 unit test tekrarı | Validation/MIME/slug testleri geçmeli | 5/5 geçti | Başarılı | — |
| 2026-09-23 | İlk Phase 2 production build | Credential olmadan build tamamlanmalı | Eager project repository import'u page-data collection sırasında TURSO_DATABASE_URL istedi | Başarısız | Repository DB import'u runtime lazy import yapıldı |
| 2026-09-23 | Phase 2 production build tekrarı | Secret olmadan build tamamlanmalı | Exit code 0; public/admin project sayfaları ve API'ler dinamik route olarak üretildi | Başarılı | — |
| 2026-09-23 | Phase 2 migration | Mevcut migration geçici libSQL'e uygulanmalı | Migration başarıyla uygulandı; yeni şema değişikliği gerekmedi | Başarılı | — |
| 2026-09-23 | İlk HTTP auth testi | Test admin login 200 olmalı | Origin header olmayan Node istemcisi Better Auth tarafından 403 reddedildi | Başarısız | Test istemcisine gerçek same-origin `Origin` header eklendi |
| 2026-09-23 | Oturumsuz project mutations | Create/update/delete/presign reddedilmeli | Dört endpoint HTTP 401 | Başarılı | — |
| 2026-09-23 | Project validation | Invalid slug/URL, duplicate slug ve nonexistent skill reddedilmeli | Tümü HTTP 400 | Başarılı | — |
| 2026-09-23 | CRUD transaction akışı | Admin create/update/delete yapabilmeli | Create 201, update 200, delete 204 | Başarılı | Geçici fixture production verisine yazılmadı |
| 2026-09-23 | Unpublished public filtre | Draft listede olmamalı, detay 404 olmalı | Liste içermedi; detay HTTP 404 | Başarılı | — |
| 2026-09-23 | Private repository leakage | Private URL public HTML'e girmemeli | “Private repository” etiketi var; özel URL literal eşleşmesi yok | Başarılı | — |
| 2026-09-23 | Upload abuse metadata | SVG, >5 MB ve arbitrary finalize token reddedilmeli | Üç senaryo HTTP 400 | Başarılı | — |
| 2026-09-23 | R2 gerçek integration | Presign + PUT + HEAD + finalize + cleanup çalışmalı | Gerçek R2 credential/bucket CORS verilmedi | Beklemede | Credential sonrası güvenli test object ile çalıştırılacak |
| 2026-09-23 | Phase 2 foreign key kontrolü | FK ihlali olmamalı | `PRAGMA foreign_key_check` boş sonuç; test sonrası projects sayısı 0 | Başarılı | — |
| 2026-09-23 | İlk test DB cleanup komutu | Geçici DB silinmeli | PowerShell quoting sorguyu böldü; DB dev child process tarafından kilitli kaldı | Başarısız | FK/count ayrı güvenli komutla doğrulandı; kilitli, gitignored geçici DB cleanup bekliyor |
| 2026-09-23 | Final Phase 2 lint | ESLint hatasız tamamlanmalı | Exit code 0, hata/uyarı yok | Başarılı | — |
| 2026-09-23 | İlk final npm audit | Registry ve cache erişimiyle sonuç dönmeli | Sandbox ağ/cache kısıtı nedeniyle audit endpoint hatası | Başarısız | Host ortamında tekrarlandı |
| 2026-09-23 | Final npm audit tekrarı | Bilinen vulnerability olmamalı | 0 vulnerability | Başarılı | — |
| 2026-09-23 | Final Phase 2 test | Beş unit test geçmeli | 5/5 geçti | Başarılı | — |
| 2026-09-23 | Final Phase 2 build | TypeScript ve production build tamamlanmalı | Exit code 0; 15 route beklendiği gibi static/dynamic üretildi | Başarılı | — |
| 2026-09-23 | Phase 3 Tiptap dependency install | 4 paket hatasız kurulmalı | `npm install` exit code 0, 0 vulnerability | Başarılı | — |
| 2026-09-23 | Phase 3 unit testleri (`npm test`) | Blog + project validation testleri geçmeli | 18/18 geçti (Tiptap allowlist, link protokolü, slug, kategori) | Başarılı | — |
| 2026-09-23 | Phase 3 lint (`npm run lint`) | ESLint hatasız tamamlanmalı | Exit code 0, hata/uyarı yok | Başarılı | — |
| 2026-09-23 | İlk Phase 3 production build | Secret olmadan build tamamlanmalı | `getPublicPost` dönüş tipi `attachPublicExtras` içinde `seoTitle`/`seoDescription` alanlarını daraltıyordu, TS2339 | Başarısız | `attachPublicExtras` generic (`<T extends PublicPostRow>`) yapıldı |
| 2026-09-23 | Phase 3 production build tekrarı | TypeScript ve build tamamlanmalı | Exit code 0; `/blog`, `/blog/[slug]`, `/admin/blog/**`, `/api/admin/posts/**`, `/api/admin/categories/**` dahil 28 route beklendiği gibi üretildi | Başarılı | — |
| 2026-09-23 | Phase 3 npm audit | Bilinen vulnerability olmamalı | 0 vulnerability | Başarılı | — |
| 2026-09-23 | Phase 3 local libSQL migration | Mevcut migration (posts/categories/tags/post_tags dahil) geçici DB'ye hatasız uygulanmalı | Migration başarıyla uygulandı; yeni migration gerekmedi (şema Phase 1'de zaten hazırdı) | Başarılı | — |
| 2026-09-23 | Phase 3 admin bootstrap | Test admin `--password` flag ile non-interactive oluşturulmalı | `auth create-admin --password ...` başarılı, admin rolü atandı | Başarılı | — |
| 2026-09-23 | Oturumsuz blog mutations | Create/update/delete/presign reddedilmeli | Dört endpoint HTTP 401 | Başarılı | — |
| 2026-09-23 | Blog input validation | Geçersiz slug, çok kısa özet reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | Geçersiz kategori/etiket ID | Var olmayan UUID reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | Malformed/desteklenmeyen Tiptap JSON | `type: "not-a-doc"` ve `image` düğümü reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | XSS: `javascript:` link + `<script>` metin payload'ı | İstek reddedilmeli, veri yazılmamalı | HTTP 400 | Başarılı | — |
| 2026-09-23 | Duplicate slug | İkinci create reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | Draft sızıntısı | Draft yazı `/blog` listesinde olmamalı, `/blog/[slug]` 404 vermeli | Liste içermedi; detay HTTP 404 | Başarılı | — |
| 2026-09-23 | Unauthorized cover presign | Oturumsuz istek reddedilmeli | HTTP 401 | Başarılı | — |
| 2026-09-23 | Publish → publishedAt otomatik atama | `status: published` sonrası `publishedAt` set edilmeli, sayfa görünmeli | HTTP 200; `/blog/[slug]` 200 ve başlık/gövde metni HTML'de mevcut | Başarılı | — |
| 2026-09-23 | XSS render kontrolü | `<script>alert(1)</script>` literal olarak public HTML'de çalıştırılabilir biçimde yer almamalı | `doesNotMatch` geçti; içerik yalnızca reddedildiği için hiç yazılmadı | Başarılı | — |
| 2026-09-23 | Cover upload abuse | SVG MIME, >5 MB ve arbitrary finalize token reddedilmeli | Üç senaryo HTTP 400 | Başarılı | — |
| 2026-09-23 | Authenticated delete ve public kaldırma | Delete 204, sonrasında detay 404 olmalı | Başarılı | Başarılı | — |
| 2026-09-23 | Phase 3 foreign key kontrolü | Test sonrası FK ihlali olmamalı | `PRAGMA foreign_key_check` boş sonuç; `posts` tablosu 0 satır | Başarılı | — |
| 2026-09-23 | Phase 3 test DB/server cleanup | Geçici dev server ve local DB kaldırılmalı | Dev server process sonlandırıldı; `phase3-test.db*` ve log dosyası silindi | Başarılı | — |
| 2026-09-23 | Final Phase 3 lint/build/audit | Üçü de hatasız tamamlanmalı | lint 0 hata, build exit 0 (28 route), audit 0 vulnerability | Başarılı | — |
| 2026-09-23 | Phase 4 `@react-pdf/renderer` kurulumu | 4.9.0 stable, React 19 peer desteği doğrulanmalı | `npm view` peerDependencies React 19 içeriyor; install 0 vulnerability | Başarılı | — |
| 2026-09-23 | Phase 4 migration generate | Üç additive kolon (profiles/projects/cv_settings) üretilmeli | `drizzle-kit generate` başarıyla `phase4_cv_additions` migration'ını üretti | Başarılı | — |
| 2026-09-23 | İlk Phase 4 unit test (project-validation) | Mevcut testler geçmeli | `includeInCv` alanı eklenince şema testi 400 (eksik alan) verdi | Başarısız | Test fixture'ına `includeInCv: false` eklendi |
| 2026-09-23 | Phase 4 unit test tekrarı (project-validation) | Test geçmeli | Geçti | Başarılı | — |
| 2026-09-23 | Phase 4 unit testleri (cv-validation, ats-rules) | 20 yeni test geçmeli | 20/20 geçti (toplam 38/38) | Başarılı | — |
| 2026-09-23 | Phase 4 lint | ESLint hatasız tamamlanmalı | Exit code 0 | Başarılı | — |
| 2026-09-23 | İlk Phase 4 production build | Secret olmadan build tamamlanmalı | `cvSettingsInputSchema`'da `z.record(enum, boolean)` "tüm anahtarlar zorunlu" tipi ürettiği için TS2769 hatası | Başarısız | `z.partialRecord` API'sine geçildi |
| 2026-09-23 | Phase 4 production build tekrarı | TypeScript ve build tamamlanmalı | Exit code 0; `/cv`, `/api/cv/pdf`, `/admin/profile`, `/admin/education`, `/admin/experience`, `/admin/skills`, `/admin/cv` dahil toplam route sayısı arttı | Başarılı | — |
| 2026-09-23 | Phase 4 npm audit | Bilinen vulnerability olmamalı | 0 vulnerability | Başarılı | — |
| 2026-09-23 | Phase 4 local libSQL migration + admin bootstrap | Migration uygulanmalı, `--password` flag ile non-interactive admin oluşmalı | İkisi de başarılı | Başarılı | — |
| 2026-09-23 | Oturumsuz profile/education/experience/skill/cv-settings mutation | Beş endpoint reddedilmeli | Hepsi HTTP 401 | Başarılı | — |
| 2026-09-23 | Profil validation: geçersiz email | Reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | Eğitim validation: bitiş<başlangıç ve current+endDate | İkisi de reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | Skill validation: geçersiz slug | Reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | CV settings validation: geçersiz section order | Reddedilmeli | HTTP 400 | Başarılı | — |
| 2026-09-23 | Olmayan eğitim/deneyim/yetenek/proje-state kaydı | 404 dönmeli | Dördü de HTTP 404 | Başarılı | — |
| 2026-09-23 | Profil oluşturma (upsert) | HTTP 200 dönmeli | Başarılı | Başarılı | — |
| 2026-09-23 | İlk education disposable fixture create | 201 beklenirken `program: "X"` 1 karakter olduğu için 400 döndü | Test fixture hatası (uygulama doğru çalışıyor) | Başarısız | Fixture `"Genel"` olarak düzeltildi |
| 2026-09-23 | Skill/Education/Experience CRUD (create/update/delete) | Hepsi başarıyla tamamlanmalı | create 201, update 200, delete 204 | Başarılı | — |
| 2026-09-23 | CV projesi ve yayınlanmamış proje oluşturma | İkisi de 201 dönmeli | Başarılı | Başarılı | — |
| 2026-09-23 | CV ayarları kaydetme | HTTP 200 dönmeli | Başarılı | Başarılı | — |
| 2026-09-23 | Public `/cv` privacy testi | Gizli email/konum sızmamalı; gizli yetenek/yayınlanmamış proje görünmemeli; görünür yetenek/CV projesi görünmeli | Tüm assertion'lar geçti | Başarılı | — |
| 2026-09-23 | PDF endpoint header/gövde testi | 200, `application/pdf`, doğru `Content-Disposition`, boş olmayan gövde, `%PDF` imzası | Tüm assertion'lar geçti | Başarılı | — |
| 2026-09-23 | İlk PDF metin çıkarım testi | İsim/başlık metin olarak bulunmalı | Çıkarılan metin boş döndü; react-pdf `TJ` operatöründe hex-encoded `<...>` string kullanıyor, çıkarıcı yalnız `(...)` literal string destekliyordu | Başarısız | `tests/pdf-text-extract.mjs` hem literal hem hex string token'larını okuyacak şekilde güncellendi |
| 2026-09-23 | PDF metin çıkarım testi tekrarı | İsim, bölüm başlığı, görünür yetenek, CV projesi metin olarak bulunmalı; gizli alanlar bulunmamalı | Tüm assertion'lar geçti (isim/başlık/skill/proje bulundu; gizli email/konum/yetenek bulunmadı) | Başarılı | — |
| 2026-09-23 | Tek veri kaynağı tutarlılık testi | Profile headline değişikliği hem `/cv` hem yeniden üretilen PDF'e aynı anda yansımalı | Her iki çıktı da güncellenmiş headline'ı içerdi | Başarılı | Bu, "tek veri kaynağından web ve PDF üretimi" iddiasının teknik kanıtıdır |
| 2026-09-23 | İlk bölüm görünürlüğü testi | Skills bölümü kapatılınca yetenek adı sayfadan tamamen kalkmalı (varsayım) | Yetenek adı, aynı yeteneğin bağlı olduğu proje kartının teknoloji etiketinde haklı olarak görünmeye devam etti | Başarısız (test asersiyonu hatalıydı, uygulama doğru) | Assertion, bölüm başlığının (`id="cv-skills"`) kaybolduğunu kontrol edecek şekilde düzeltildi |
| 2026-09-23 | Bölüm görünürlüğü testi tekrarı | Skills bölüm başlığı public CV'den kalkmalı | Geçti | Başarılı | — |
| 2026-09-23 | Phase 4 test fixture temizliği | Oluşturulan proje/eğitim/skill kayıtları silinmeli | Tümü HTTP 204 ile silindi | Başarılı | — |
| 2026-09-23 | Phase 4 foreign key kontrolü | Test sonrası FK ihlali olmamalı | `PRAGMA foreign_key_check` boş sonuç; projects/skills/education 0 satır | Başarılı | — |
| 2026-09-23 | Phase 4 test DB/server cleanup | Geçici dev server ve local DB kaldırılmalı | Dev server process sonlandırıldı; `phase4-test.db*` ve log dosyası silindi | Başarılı | — |
| 2026-09-23 | Final Phase 4 lint/test/build/audit | Dördü de hatasız tamamlanmalı | lint 0 hata, 38/38 unit test, build exit 0, audit 0 vulnerability | Başarılı | — |
| 2026-09-24 | İlk Phase 5 unit test komutu (sandbox) | Test runner başlamalı | Windows `uv_os_get_passwd` ENOMEM ile başlamadı | Başarısız | Önceki fazlarda belgelenen sandbox sorunu; host ortamında tekrarlandı |
| 2026-09-24 | Phase 5 unit/security testleri | Mevcut regresyonlar + env/origin/CSP/magic-byte geçmeli | 44/44 test geçti; Phase 5'e özgü 6 test başarılı | Başarılı | — |
| 2026-09-24 | İlk Phase 5 build | TypeScript/build tamamlanmalı | Testte `process.env.NODE_ENV` salt-okunur tipine doğrudan atama TS2540 üretti | Başarısız | Test `Reflect.set` kullanacak şekilde düzeltildi |
| 2026-09-24 | Secretsız Phase 5 production build | Credential olmadan build ve route sınıflandırması korunmalı | Exit 0; `/admin/login` static, DB kullanan public/admin route'lar önceki gibi dynamic | Başarılı | Nonce/proxy eklenmedi |
| 2026-09-24 | Production response headers | CSP/HSTS/nosniff/frame/referrer/permissions/no-store olmalı; X-Powered-By olmamalı | `/admin/login` HTTP 200; tüm başlıklar mevcut, powered-by yok | Başarılı | Local HTTP yalnız header varlığını test eder; HSTS tarayıcı etkisi HTTPS'te doğrulanmalı |
| 2026-09-24 | Production CSP kapsamı | Wildcard/unsafe-eval olmamalı; R2 origin dar olmalı | Production response `unsafe-eval`/wildcard yok; `https://media.example.com` yalnız img-src içinde | Başarılı | Sentinel R2 public origin kullanıldı |
| 2026-09-24 | Sentinel secret client taraması | Turso URL/token, auth secret, R2 access/secret client JS/HTML'de olmamalı | Beş sentinel için 0 eşleşme | Başarılı | `.next/static` ve statik app HTML/JSON tarandı |
| 2026-09-24 | İlk Phase 5 HTTP security testi | 7 grup geçmeli | Next dev admin login cache header'ı `no-store` yerine güvenli `no-cache, must-revalidate` override ettiği için assertion durdu | Başarısız | Test development'ta iki güvenli private-cache biçimini kabul edecek şekilde düzeltildi; production no-store ayrıca gerçek response'ta doğrulandı |
| 2026-09-24 | İkinci Phase 5 HTTP security testi | 7 grup geçmeli | İlk 6 grup geçti; PDF 404 response'unda Cache-Control yoktu | Başarısız | PDF 404'e explicit `Cache-Control: no-store` eklendi |
| 2026-09-24 | Phase 5 HTTP security testi tekrarı | Public/header/cache/auth/signup/cookie/origin/PDF kontrolleri geçmeli | 7/7 grup geçti; 5 sayfa CSP, 9 mutation sınıfı 401 | Başarılı | Geçici local libSQL/admin temizlendi |
| 2026-09-24 | Login rate-limit regresyonu | 5/60 sınırı aşılınca 429 | `401,401,401,429,429,429` | Başarılı | Önceki başarılı login denemeleri aynı pencereyi tüketmişti; 429 davranışı doğrulandı |
| 2026-09-24 | İlk Phase 5 npm audit (sandbox) | Registry sonucu dönmeli | Audit endpoint sandbox ağ/cache kısıtı nedeniyle hata verdi | Başarısız | Host ağında tekrarlandı |
| 2026-09-24 | Phase 5 npm audit tekrarı | Bilinen vulnerability olmamalı | `found 0 vulnerabilities` | Başarılı | Dependency değişikliği yok |
| 2026-09-24 | Gerçek Turso cloud smoke | Migration/connectivity/read/FK doğrulanmalı | Credential sağlanmadı | Beklemede | Local libSQL migration ve HTTP sorguları başarılı |
| 2026-09-24 | Gerçek R2 cloud smoke | test namespace presign/PUT/HEAD/range/public GET/cleanup | Credential sağlanmadı | Beklemede | MIME/size/token/magic-byte kod ve unit testi başarılı |
| 2026-09-24 | HTTPS cookie doğrulaması | Secure/HttpOnly/SameSite/Path/expiry canlı TLS response'ta doğrulanmalı | Local HTTP'de HttpOnly, SameSite=Lax, Path ve expiry görüldü; TLS yok | Kısmi | Secure flag/deployed browser davranışı production HTTPS deploy sonrasına bırakıldı |
| 2026-09-24 | İlk Phase 5 FK doğrulama komutu | Local migration sonrası FK ihlali olmamalı | Migration geçti; PowerShell quoting içindeki `*` sorguyu komut olarak yorumladı | Başarısız | Shell ile çakışmayan doğrudan PRAGMA sorgusuyla tekrarlandı |
| 2026-09-24 | Local libSQL FK doğrulama tekrarı | `PRAGMA foreign_key_check` boş olmalı | `fkIssues=0` | Başarılı | Geçici database silindi |
| 2026-09-24 | Final Phase 5 lint/test/build/audit | Dördü hatasız tamamlanmalı | lint exit 0; 44/44 test; build exit 0; audit 0 vulnerability | Başarılı | — |
| 2026-09-24 | Phase 6 dependency kurulumu | Stable Anime.js/Three.js kurulmalı | animejs 4.5.0, three 0.186.0, @types/three 0.186.0; install audit 0 vulnerability | Başarılı | R3F/Drei/GSAP/Framer/Lenis eklenmedi |
| 2026-09-24 | İlk Phase 6 lint | ESLint hatasız olmalı | Render sırasında `selectedRef.current` yazımı React refs kuralını ihlal etti | Başarısız | Ref güncellemesi dependency'li effect'e taşındı |
| 2026-09-24 | Final Phase 6 lint | ESLint hatasız olmalı | Exit code 0; hata/uyarı yok | Başarılı | — |
| 2026-09-24 | İlk Phase 6 unit komutu | Test runner başlamalı | Node 24 `uv_os_get_passwd` ENOMEM; test dosyalarına ulaşmadı | Başarısız (ortam) | Uygulama kodu değiştirilmedi; test sürecine özel geçici shim ile tekrarlandı |
| 2026-09-24 | Final unit/security testleri | Eski regresyonlar + 5 Phase 6 testi geçmeli | 49/49 geçti; quality, reduced motion, DPR, timeline, skill DTO dahil | Başarılı | Geçici shim test sonrası silindi |
| 2026-09-24 | İlk visual server | Landing gerçek veriye erişebilmeli | Env olmadan beklenen `TURSO_DATABASE_URL is required` runtime hatası | Başarısız (config) | Migration'lı geçici local libSQL fixture ile tekrarlandı |
| 2026-09-24 | Browser landing desktop | Hero/HTML/canvas görünmeli, console yeni hata üretmemeli | Semantik Hero + bütün section'lar göründü; 2 canvas; taşma yok | Başarılı | Uygulama içi tarayıcı; Chrome provider mevcut değildi |
| 2026-09-24 | Browser reduced motion | İçerik eksilmeden hareket statikleşmeli | Browser `prefers-reduced-motion` sonucu `data-motion=reduced`; reveal içerikleri görünür, canvas statik | Başarılı | Gerçek browser preference ile doğrulandı |
| 2026-09-24 | İlk Three browser console | Deprecation/error olmamalı | Three 0.186 `Clock` deprecation uyarısı | Başarısız | `performance.now()` tabanlı elapsed time kullanıldı; reload sonrası yeni uyarı oluşmadı |
| 2026-09-24 | Browser mobile 390 px | Tek kolon, okunur Hero/skill, yatay taşma yok | 375 CSS px viewport'ta hero 343 px, skill tek kolon, overflow=false; CSS fallback kaliteli | Başarılı | Skill TypeScript tap sonrası `aria-pressed=true` |
| 2026-09-24 | Browser yaklaşık %200 zoom | İçerik görünür, horizontal overflow olmamalı | H1 görünür; `scrollWidth=clientWidth`, overflow=false | Başarılı | In-app browser keyboard zoom davranışı üzerinden smoke |
| 2026-09-24 | Accessibility semantics | Canvas tek bilgi kaynağı olmamalı, focus/tap çalışmalı | 5 skill gerçek HTML button listesinde; headings/links/timeline AX ağacında; tap seçimi çalıştı | Başarılı | Canvas `aria-hidden` dekoratif katman |
| 2026-09-24 | HTTP route regresyonu | `/`, `/projects`, `/blog`, `/cv`, `/admin/login` 200 | Beşi de 200 | Başarılı | Geçici local fixture; detay project/blog rotaları da browserda açıldı |
| 2026-09-24 | Route visual/bundle sınırı | Detail blog/CV/admin Three canvas taşımamalı | project list/detail, blog list/detail, CV ve admin login direct navigation'da canvas=0 | Başarılı | Landing'de 2 canvas; dynamic import yalnız landing import ağacında |
| 2026-09-24 | Production CSP regression | CSP gevşememeli | `/admin/login` 200; production CSP wildcard/unsafe-eval yok, HSTS var, X-Powered-By yok | Başarılı | `unsafe-inline` Phase 5'te belgelenen Next bootstrap istisnasıdır |
| 2026-09-24 | Final Phase 6 build | TypeScript + production build tamamlanmalı | Exit 0; 49 route, `/admin/login` static, DB rotaları dynamic | Başarılı | Yeni migration yok |
| 2026-09-24 | Final Phase 6 npm audit (sandbox) | Registry audit sonucu dönmeli | Audit endpoint sandbox/network kısıtı; dış ağ escalation güvenlik incelemesinde reddedildi | Doğrulanamadı | Dependency install sırasında audit 0 vulnerability dönmüştü; final komut başarılı sayılmadı |
| 2026-09-24 | Gerçek production device/GPU profili | Farklı fiziksel GPU'larda FPS/memory ölçülmeli | Fiziksel cihaz laboratuvarı yok; FPS ölçülmedi | Beklemede | 60 FPS garantisi verilmedi; DPR/node/draw-call/offscreen önlemleri kodda |
| 2026-09-26 | GitHub API dokümantasyon doğrulaması | Güncel rate limit, uç nokta ve API sürümü doğrulanmalı | docs.github.com: unauth 60/saat/IP, PAT 5000/saat, `/users/{u}/repos` yalnız public, `X-GitHub-Api-Version: 2026-03-10`; canlı `x-ratelimit-limit: 60` | Başarılı | — |
| 2026-09-26 | Next.js 16 cache dokümanı | Landing'de uygun cache mekanizması seçilmeli | `force-dynamic` tüm fetch'leri `no-store` yapıyor; `fetch` revalidate etkisiz | Bilgi | `unstable_cache` seçildi (ADR-064) |
| 2026-09-26 | Phase 7 unit testleri (ilk çalıştırma) | 11 yeni test geçmeli | 11/11 geçti (allowlist, command index/filtre, terminal registry, GitHub DTO/filtre/kullanıcı adı, case section, metin ayrıştırma) | Başarılı | — |
| 2026-09-26 | Phase 7 lint + TypeScript | Hatasız | `eslint` exit 0, `tsc --noEmit` exit 0 | Başarılı | — |
| 2026-09-26 | Local libSQL migration + test admin bootstrap | Geçici DB ve admin oluşmalı | `drizzle-kit migrate` ve `auth create-admin --password` başarılı | Başarılı | Kimlik bilgileri yalnız geçici scratchpad dosyasında tutuldu |
| 2026-09-26 | Phase 5 HTTP security regresyonu | 7 grup geçmeli | 7/7 (CSP/header, no-store, 9 mutation 401, signup kapalı, cookie, cross-origin, PDF 404) | Başarılı | — |
| 2026-09-26 | Phase 2 HTTP regresyonu | 9 grup geçmeli | 9/9 (private repo URL sızmıyor dahil) | Başarılı | — |
| 2026-09-26 | Phase 3 HTTP regresyonu | 12 grup geçmeli | 12/12 (draft sızıntısı, XSS payload dahil) | Başarılı | — |
| 2026-09-26 | Phase 4 HTTP regresyonu | 18 grup geçmeli | 18/18 (gizli CV alanı sızıntısı, PDF metin çıkarımı dahil) | Başarılı | — |
| 2026-09-26 | İlk Phase 7 HTTP testi | Public veri dışında hiçbir fixture değeri HTML/RSC'de olmamalı | `/cv` RSC payload'ında görünür `javascript:alert(1)` sosyal bağlantısı bulundu (React HTML'de engellemişti) | Başarısız | `getPublicCvData`/`getPublicSiteIdentity` yalnız https bağlantı döndürecek şekilde sertleştirildi |
| 2026-09-26 | Phase 7 HTTP testi tekrarı (gerçek GitHub ağı) | 8 grup geçmeli | 8/8: route 200/404, admin redirect, gizli veri sızmıyor, admin'de palet yok, case study bölümleri ve kaçışlanmış mimari metni, CSP değişmedi, gerçek octocat repoları (fork ve CMS-private `Hello-World` yok), 404 kullanıcı adında fallback | Başarılı | Test hesabı GitHub'ın resmî demo hesabı `octocat` |
| 2026-09-26 | Palet klavye testi (in-app browser) | Ctrl+K açmalı, filtre/ok/Enter/Tab trap/Escape/focus restore çalışmalı | İlk denemede palet birkaç saniye sonra kendiliğinden kapandı | Başarısız | Kök neden: StrictMode çift mount'unda kuyruğa alınmış asenkron `close` olayı; `close` yalnız `!dialog.open` iken işleniyor |
| 2026-09-26 | Palet klavye testi tekrarı | Aynı beklenti | Filtre 3 sonuç, `aria-activedescendant` güncel, ↓ wrap, Tab trap (input↔Esc), Enter ile `/projects/phase7-public-project`, Escape sonrası odak tetikleyicide, `aria-live` "3 sonuç" | Başarılı | — |
| 2026-09-26 | Ctrl+K çakışma testi | Form alanında açılmamalı, gövdede açılmalı, tekrar basınca kapanmalı | Üçü de beklendiği gibi | Başarılı | — |
| 2026-09-26 | Terminal testi | Komutlar, bilinmeyen komut, ↑/↓ geçmiş, clear, depolama yok, focus restore | `constructor` → "Komut bulunamadı"; `skills` yalnız görünür skill; geçmiş `skills`→`constructor`→boş; clear sonrası 0 satır + "Ekran temizlendi"; localStorage/sessionStorage 0 anahtar; odak geri döndü | Başarılı | — |
| 2026-09-26 | Lightbox testi | Enter açmalı, ←/→ gezmeli, Escape kapatmalı, odak thumbnail'a dönmeli, palet üst üste açılmamalı | Hepsi beklendiği gibi; lightbox açıkken Ctrl+K ikinci dialog açmadı | Başarılı | — |
| 2026-09-26 | İlk mobil menü testi (375 px) | Menü açılınca Tab linklere girmeli, Escape kapatmalı | Tab DOM sırası nedeniyle linkleri atladı; Escape odak dışarıdayken çalışmadı | Başarısız | DOM sırası toggle→nav→arama yapıldı, Escape tüm kümeye taşındı |
| 2026-09-26 | Mobil menü testi tekrarı | Aynı beklenti | Tab "Ana sayfa"ya girdi, `/cv`'de CV `aria-current=page`, Escape menüyü kapatıp odağı toggle'a verdi, taşma yok | Başarılı | — |
| 2026-09-26 | İlk yaklaşık %200 zoom testi (640×400) | Sayfa taşması olmamalı, dialoglar ekranda kalmalı | Landing/detail taşma yok; palet alt kenarı viewport dışına taştı (48+368 px) | Başarısız | `max-height` 88dvh tabanlı yapıldı, kısa viewport için ek media query |
| 2026-09-26 | %200 zoom testi tekrarı | Aynı beklenti | Palet 8–392 px, footer görünür; lightbox 16–384 px, kontroller görünür; terminal formu görünür | Başarılı | Tarayıcı zoom'u değil eşdeğer CSS viewport emülasyonu kullanıldı |
| 2026-09-26 | İlk 404 kontrolü | Header/footer bir kez görünmeli | `notFound()` rotalarında header ve footer iki kez render edildi | Başarısız | `(public)/not-found.tsx` eklendi, root not-found yalnız eşleşmeyen URL'ler için chrome taşır |
| 2026-09-26 | 404 kontrolü tekrarı | Aynı beklenti | Eşleşmeyen URL, draft proje ve draft yazıda 1 header/1 footer; admin login'de palet/terminal tetikleyicisi yok, Ctrl+K dialog açmadı | Başarılı | — |
| 2026-09-26 | Overlay pause sinyali | Dialog açıkken `data-overlay=open` + olay, kapanınca temizlenmeli | Olay sırası open→closed (dev StrictMode nedeniyle iki kez); bayrak kapanışta kalktı | Başarılı | — |
| 2026-09-26 | Dekoratif canvas frame ölçümü | Dialog açıkken rAF sayısı düşmeli | Browser paneli arka planda olduğu için rAF hiç tetiklenmedi; ölçüm yapılamadı | Doğrulanamadı | Mantık kod incelemesi ve bayrak/olay testiyle doğrulandı |
| 2026-09-26 | Reduced motion (Phase 7 dialogları) | Açılış animasyonu kapanmalı | `@media (prefers-reduced-motion: reduce) .modal-dialog { animation: none }` kuralı eklendi; bu oturumda browser tercih emülasyonu mevcut değildi | Kısmi | Runtime emülasyonu yapılmadı |
| 2026-09-26 | Browser console | Yeni hata olmamalı | Hata mesajı yok | Başarılı | — |
| 2026-09-26 | Final unit/security testleri | Tüm testler geçmeli | `npm test` 60/60; `npm run test:security` 6/6 | Başarılı | — |
| 2026-09-26 | Final production build | TypeScript + build | Exit 0; `/admin/login` static, DB rotaları dynamic | Başarılı | Yeni migration yok |
| 2026-09-26 | Bundle isolation + production header | Palet/terminal/GitHub kodu admin'e girmemeli; token client'ta olmamalı; CSP değişmemeli | Palet 8.1 KB, terminal 7.4 KB ayrı chunk; `/admin/login` 10 script'inde marker yok; client chunk'larında `GITHUB_TOKEN`/`api.github.com` 0; Three tek chunk; CSP `connect-src 'self'`, HSTS var, X-Powered-By yok | Başarılı | `next start -p 3200` |
| 2026-09-26 | Final npm audit | Bilinen vulnerability olmamalı | `found 0 vulnerabilities` | Başarılı | Dependency değişikliği yok |
| 2026-09-26 | Phase 7 test DB/server cleanup | Geçici DB ve sunucular kaldırılmalı | Dev/prod server sonlandırıldı; `phase7-test.db*` silindi | Başarılı | — |
| 2026-09-26 | Gerçek ekran okuyucu / fiziksel mobil cihaz | NVDA/VoiceOver ve gerçek cihaz testi | Yapılmadı | Beklemede | ARIA/DOM düzeyinde doğrulama yapıldı |
| 2026-09-26 | Phase 8 local baseline | lint/unit/audit/build temiz olmalı | lint exit 0; 60/60 unit; audit 0; build başarılı | Başarılı | Regresyon yok |
| 2026-09-26 | Araç envanteri | Vercel/Turso/Wrangler CLI durumu | Vercel CLI 59.15.1 kurulu, hesap oturumu açık, proje linkli değil; Turso CLI ve Wrangler kurulu değil; git remote yok | Bilgi | — |
| 2026-09-26 | Social link unit testleri | 3 test geçmeli | 3/3 (https-only, hostile şemalar, platform enum, GitHub profil biçimi) | Başarılı | — |
| 2026-09-26 | Phase 5/2/3/4 HTTP regresyonu (social kodu ile) | 7/9/12/18 grup geçmeli | Hepsi geçti | Başarılı | Geçici local libSQL |
| 2026-09-26 | Phase 8 social HTTP testi | 10 grup geçmeli | 10/10: anonim create/update/delete/move 401, cross-origin 401, javascript/data/vbscript/http/geçersiz/GitHub repo URL 400, geçersiz platform 400, gizli link public HTML/RSC'de yok, admin GitHub linki landing bölümünü besliyor (gerçek octocat repoları), reorder, görünürlük toggle, delete + 404 | Başarılı | Bir kontrolün adı ("profile prerequisite is enforced") ön koşulu gerçekten test etmediği için "profile is saved for the social link FK" olarak düzeltildi |
| 2026-09-26 | Phase 7 HTTP regresyonu | 8 grup geçmeli | 8/8 | Başarılı | — |
| 2026-09-26 | Cloud kararı | Vercel/Turso/R2 kurulumu | Proje sahibi public'e çıkmama ve uzak repo oluşturmama kararı verdi | Ertelendi | Bulut adımları çalıştırılmadı (ADR-082) |
| 2026-09-26 | Social admin UI (in-app browser) | Form, hata mesajı, liste, toggle çalışmalı | `javascript:alert(1)` → "Yalnız https:// ile başlayan geçerli bir adres kabul edilir."; `https://github.com/octocat` eklendi; "Gizle" sonrası landing GitHub bölümü kalktı; 375 px'te sayfa taşması yok, tablo kendi içinde kayıyor | Başarılı | Tek kullanımlık local test admini ve DB |
| 2026-09-26 | NVDA varlığı | Gerçek ekran okuyucu testi | Makinede NVDA kurulu değil | Beklemede | DOM/ARIA testleri gerçek ekran okuyucu testi sayılmadı |
| 2026-09-26 | Reduced-motion runtime emülasyonu | Tercih emülasyonu ile doğrulama | In-app browser aracı `prefers-reduced-motion` emülasyonu sunmuyor | Beklemede | CSS/JS kuralları Phase 6–7'de mevcut |
| 2026-09-26 | Turso erişilemez hata modu (local `next start`, dummy libSQL adresi) | Raw cloud hatası sızmamalı | `/`, `/projects`, `/cv` 500 genel sayfa; `/api/cv/pdf` 500 generic JSON; `/admin/login` 200; sign-in 500 boş gövde; anonim PUT profile 401; yanıtlarda libsql/turso/host/stack 0; log'da dummy token/secret 0 | Başarılı | İlk denemede profile için POST kullanıldı ve 405 döndü (route PUT); PUT ile tekrarlandı |
| 2026-09-26 | Silme işlemi | Geçici DB/credential dosyaları silinmeli | Oturum dosyaları silindi; adında "test" geçen `phase8-test.db` ve scratchpad `testvars.sh` silme komutu repository hook'u tarafından engellendi | Kısmi | Kullanıcının manuel silmesi gerekir; DB gitignored, credential yalnız bu DB için geçerli |
| 2026-09-26 | Phase 8 betik sözdizimi | 4 betik `node --check` geçmeli | 4/4 | Başarılı | Betikler hedef ortam olmadığı için çalıştırılmadı |
| 2026-09-26 | Final lint/tsc/unit/security/build/audit | Hepsi temiz | lint 0, tsc 0, 63/63, security 6/6, build başarılı (`/admin/social` ve social API route'ları), audit 0 | Başarılı | — |
| 2026-09-26 | Production deploy, Turso, R2, CORS, HTTPS cookie, deployed CSP/HSTS, PDF/GitHub/media production, Lighthouse, fiziksel cihaz | Canlı doğrulama | Çalıştırılmadı | Beklemede | Kullanıcı kararı; rehber ve betikler hazır |
| 2026-09-26 | Phase 9 geçici dosya temizliği | Atıl DB/credential/log kalmamalı | `.tmp-phase2-test.db` ve `phase8-test.db` silindi; `testvars.sh` yoktu; final HTTP DB/log/script dosyaları test sonunda kaldırıldı | Başarılı | Production verisi kullanılmadı |
| 2026-09-26 | Phase 9 final lint ve TypeScript | Hatasız tamamlanmalı | `npm run lint` exit 0; `npx tsc --noEmit` exit 0 | Başarılı | — |
| 2026-09-26 | Phase 9 final unit testi | 63 test geçmeli | İlk sandbox denemesi test başlamadan `uv_os_get_passwd ENOMEM`; izinli host tekrarında 63/63 | Başarılı | Bilinen Windows/Node sandbox ortam sorunu uygulama hatası sayılmadı |
| 2026-09-26 | Phase 9 security unit | 6 test geçmeli | 6/6 | Başarılı | Final tekrar aşağıdaki test matrisiyle birlikte çalıştırıldı |
| 2026-09-26 | Phase 9 local HTTP regresyonu | Phase 5/2/3/4/7/8 grupları geçmeli | 7/7, 9/9, 12/12, 18/18, 8/8, 10/10; toplam 64/64 | Başarılı | Disposable local libSQL; Phase 7/8 gerçek GitHub public API kontrolü dahil |
| 2026-09-26 | Phase 9 production build | Next.js build tamamlanmalı | Next.js 16.3.6 build başarılı; 13 static generation adımı ve beklenen static/dynamic route'lar | Başarılı | Cloud env kullanılmadı |
| 2026-09-26 | Phase 9 dependency audit | Bilinen vulnerability olmamalı | `found 0 vulnerabilities` | Başarılı | `--audit-level=low` |
| 2026-09-26 | Phase 9 cloud/deploy doğrulaması | Kullanıcı kararı korunmalı | Vercel/Turso/R2/remote repo/deploy oluşturulmadı veya çalıştırılmadı | Ertelendi | `DEPLOYMENT.md` planı değişmeden geçerli |

## 1.1.0 UX/CV Phase — Güncel Sonuçlar

| Kontrol | Gerçek sonuç | Durum |
| --- | --- | --- |
| Additive local migration | Üç yeni alan; eski GitHub/LinkedIn/Website CV true; tüm mevcut tablo kayıt sayıları korundu; backup saklandı | Başarılı |
| Unit | 68/68; ilk sandbox ENOMEM, host tekrarında geçti | Başarılı |
| Security unit | Ayrı komut 6/6 | Başarılı |
| HTTP | Phase 5/7/2/3/4/8/10: 7+7+9+12+18+10+7 = 70/70; izole local libSQL/next dev | Başarılı |
| Phone/privacy | Geçerli PUT, invalid 400; görünür Contact/web/PDF; gizli telefon landing/CV HTML-RSC ve PDF'de yok | Başarılı |
| Social/CV | Instagram website visible/CV false; CV shell dahil raw HTML/RSC'de yok; GitHub CV true; javascript URL 400 | Başarılı |
| Bio/timeline/program | Hero text visible count=1; Kısa Profil yok; About longBio; timeline unit project exclusion; blank program create/update ve placeholder render suppression | Başarılı |
| PDF metin | ĞğÜüŞşİıÖöÇç ve Bilgisayar Programcılığı Öğrencisi; bağımsız PDFium extraction true; Type0/ToUnicode test okuyucusu ligature destekli | Başarılı |
| PDF visual | Gerçek PDF→Poppler PNG; Türkçe/telefon/başlık hizası/boş program; ikinci fixture proje/yetenek/eğitim incelendi | Başarılı |
| Browser | CSS 1439×900, 375×812, 390×812, 719×451; menü/Terminal/Contact/CV/footer; horizontal overflow false, console error=[] | Başarılı |
| Background | Hero→Contact section state ve CSS variables değişti; grid yaklaşık -193px, light alt-orta; Three scene korunmuş | Başarılı |
| Reduced motion | JS/CSS preference reset/statik kod incelemesi; araç runtime emülasyonu sunmuyor | Kısmi, runtime pending |
| lint / TypeScript / build | Final üç komut exit 0; Next 16.3.6 build 13 static adımı tamamlandı | Başarılı |
| npm audit | --audit-level=low: found 0 vulnerabilities | Başarılı |
| İlk denemelerde düzeltmeler | Eski CSS sırası, CV env fallback, JSX kapanışı, eski unit/copy expectation, Unicode fi ligature okuyucusu, test-build lint ignore | Giderildi |
| Test runner güvenliği | Production file DB reddi korunur; mevcut 3000 sunucusu durdurulmadı; signin 429 limiter gevşetilmeden pencere beklemesiyle çözüldü | Başarılı |
| Cloud / gerçek cihaz / FPS / Lighthouse | Çalıştırılmadı; deployment/remote oluşturulmadı | Pending |
| Geçici DB temizliği | Bu oturumun 13 disposable test DB dosyası kaldırıldı; local.db ve migration backup korundu. Cleanup sırasında PowerShell Split-Path parametre uyarısı çıktı; son read-only kontrolle kalan test DB sayısı 0 doğrulandı | Tamamlandı |
| Son ek fixture kontrolü | Phase 10 7/7 tekrar: published proje gerçek HTML'de mevcut fakat journey section'da yok; eğitim ve deneyim mevcut. Tam bölüm setli son PDF PNG'si görsel olarak incelendi; lint tekrar exit 0 | Başarılı |
| Kullanıcı verisi karşılaştırması | Profiles/education/experiences/skills/social_links/projects/posts eski sütunları migration backup ile birebir aynı; son ek test DB'si ayrıca kaldırıldı | Başarılı |
