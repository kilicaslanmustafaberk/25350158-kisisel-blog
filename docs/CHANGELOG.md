# Değişiklik Günlüğü

## [1.9.0] — Yüklenen profesyonel CV birincil public CV (2026-10-15)

### Added
- Admin CV sayfasında **Profesyonel CV PDF** bölümü: durum (Yüklendi/Yüklenmedi), özgün dosya adı, boyut, yüklenme tarihi, **CV'yi Aç**, **İndir**, **Değiştir / Yeni PDF Yükle** ve onaylı **Profesyonel CV'yi kaldır**.
- `POST /api/admin/cv/pdf/presign`, `POST /api/admin/cv/pdf/finalize`, `DELETE /api/admin/cv/pdf` (yalnız admin + aynı origin). Akış: presign → imzalı PUT (`cv/<uuid>.pdf`) → finalize (HEAD MIME/boyut/bilet + Range GET `%PDF-`) → tek işlemde aktif CV geçişi → eski nesnenin best-effort silinmesi.
- Eklemeli migration `drizzle/20261015154218_phase19_uploaded_cv_pdf`: `cv_settings` tablosuna `uploaded_pdf_key`, `uploaded_pdf_original_name`, `uploaded_pdf_size`, `uploaded_pdf_uploaded_at` (nullable).
- `src/features/cv/uploaded-pdf.ts` (doğrulama/teslim yardımcıları), `src/server/cv/uploaded-pdf.ts` (aktif CV okuma/geçiş/kaldırma), alan-ayrımlı CV yükleme bileti (`upload-token.ts`), production'da yok sayılan loopback `R2_TEST_ENDPOINT` test seam'i.
- ADR-095.

### Changed
- `GET /api/cv/pdf`: aktif yüklenmiş profesyonel PDF varsa onu (R2'den sunucu tarafında, aynı origin), yoksa veya depolama okunamazsa üretilen react-pdf CV'yi sunar. Varsayılan `Content-Disposition: inline`; `?download=1` → `attachment`. `nosniff`, `no-store`, sabit dosya adı (`<ad-soyad>-cv.pdf`). Önceden her zaman `attachment` idi.
- Public "CV" girişleri (navbar, hero CTA, CV paneli, İletişim, komut paleti, terminal) `/api/cv/pdf`'i yeni sekmede açar; `/cv` Web CV olarak korunur, Web CV'deki "PDF indir" `?download=1` kullanır.
- `getCvSettings()` açık kolon listesi kullanır; 1.9.0 migration'ı uygulanmamış veritabanında public sayfalar ve Web CV çalışmaya devam eder, admin CV sayfası migration uyarısı gösterir.
- Proje sayfalarındaki ziyaretçiye dönük İngilizce etiketler Türkçeleştirildi: "Canlı projeyi görüntüle", "Kaynak kodu görüntüle", "Özel depo", "Proje vaka çalışması", "Proje vitrini", "Proje önizlemesi", "mimari notlar". Sertifikaların İngilizce etiketleri (İngilizce CV modu) bilinçli olarak korundu.

### Fixed
- Admin CV (ve Blog listesi) başlığındaki `.button` bağlantılarının yazısı görünmüyordu: `.table-actions a` kuralı `.button-primary` rengini eziyordu. Kompakt metin kuralları `:not(.button)` ile sınırlandı; `.button:disabled` durumu eklendi.
- Mobilde (≈375–430 px) "01 // ANA SAYFA" işareti CTA düğmelerine yapışıyordu: masaüstü `hero-grid { gap: 0 }` mobil yığılmış düzene taşıyordu. Mobil blokta `gap` verildi; çapa halkası artık "01" metninin üzerine binmiyor.

### Tests
- Yeni `tests/cv-uploaded-pdf.test.ts` (şema, dosya adı, disposition, giriş noktaları) ve `tests/phase5-security.test.ts` içinde 4 yeni güvenlik testi (PDF imzası, anahtar isim alanı, header injection, test seam).
- Yeni `tests/phase19-http.mjs`: R2 yapılandırılmamış modda tam regresyona eklendi; `tests/cv-upload-regression.mjs` (`npm run test:cv:http`) yerel S3 mock'u (`tests/r2-mock-server.mjs`) ile tam yükleme akışını, sahte PDF reddini, değiştirmeyi, kaldırmayı ve depolama kesintisi yedeğini doğrular.
- `phase4-http`, `phase8-production-smoke`: yeni `inline`/`attachment` sözleşmesi. `phase2-http`, `phase7-http`: "Özel depo" etiketi. `phase18-http`: İletişim satırında `/api/cv/pdf` güvenli hedef.

Final kapılar: unit 131/131, security unit 11/11, security HTTP 8/8, tam HTTP 140/140, yüklenen CV HTTP 16/16 (yerel S3 mock); lint, typecheck ve production build başarılı; `npm audit --omit=dev` 0 zafiyet, tam audit yalnız dev-only `braces` zinciri; bağımlılık değişmedi.

Geliştirme sırasında gerçek `local.db` migrate edilmedi ve değiştirilmedi; migration ve gerçek profesyonel PDF yüklemesi daha sonra kullanıcı tarafından yapıldı (`web_cv.pdf`, 341.933 bayt; public uç nokta `X-CV-Source: uploaded` döndürüyor).

## [1.8.4] — PDF CV sayfalama düzeltmesi (2026-10-10)

### Fixed
- PDF CV mevcut içerikle 3 sayfa üretiyordu: sayfa 1'de Eğitim'den sonra büyük boşluk kalıyor, Sertifikalar bölümü bütünüyle sayfa 2'ye geçiyor, BOTAŞ deneyim açıklamasının son iki satırı tek başına sayfa 3'e düşüyordu. Artık aynı içerik 2 sayfadır.
- Kök neden (react-pdf legacy paginator): sığan bir bloğun `marginBottom` değeri de "sığıyor mu" hesabına katılıyor; ayrıca `minPresenceAhead`/keep-together kararları yalnız aynı kapsayıcıdaki kardeşler arasında çalışıyor. Bölümler tek `View` içinde olduğu için başlık ilk öğeyi tutamıyor, açıklama metni öğesinden ayrı bölünebiliyordu.
- `src/server/cv/pdf-document.tsx`: bölümler sayfa düzeyinde düz bloklar; başlık + ilk öğe tek `wrap={false}` blok; her öğe ayrı `wrap={false}` blok; boşluklar yalnız `marginTop`; 600 karakterden uzun açıklamalarda yalnız başlık/kurum/tarih bloğu bir arada tutulur (`minPresenceAhead`). Sertifika ikincil bilgileri ve doğrulama bağlantısı tek satırda. Font boyutları, Noto Sans ve tek kolon yapı değişmedi.

### Tests
- `tests/pdf-unicode-extract.mjs`: sayfa bazlı metin çıkarımı (`extractUnicodePdfPages`).
- `tests/phase18-http.mjs`: sayfa sınırlarını geçen fixture ile yeni regresyon (başlık sayfa sonunda tek kalmıyor, deneyim/sertifika öğeleri bölünmüyor, ara sayfa boş kalmıyor). Eski kodda başarısız olduğu doğrulandı.

Final kapılar: unit 118/118, security unit 7/7, security HTTP 8/8, tam HTTP 130/130; lint, typecheck ve production build başarılı; Next.js 16.3.8; `npm audit --omit=dev` 0 zafiyet. R2 uygulaması ve `local.db` değiştirilmedi.

## [1.8.3] — Bağımlılık güvenlik bakımı ve gerçek R2 doğrulaması (2026-10-10)

Bu sürüm yeni bir ürün özelliği eklemez; bağımlılık bakımı ve güvenlik sertleştirmesidir.

### Security (dependencies)
- Next.js 16.3.6 → 16.3.8 (`next` ve kilit dosyası).
- sharp 0.35.4 → 0.35.5 (Next.js görsel işleme bağımlılığı).
- source-map-js 1.2.1 → 1.2.2.
- `npm audit --omit=dev`: 0 zafiyet. Tam `npm audit` yalnız lint araç zincirindeki (`eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`) development uyarısını gösterir. İnceleme anında uyumlu upstream düzeltme yoktu; `npm audit fix --force` `eslint-config-next`'i 14.x'e düşüreceği için bilinçli olarak uygulanmadı.

### Media / R2
- Cloudflare R2 gerçek bir bucket ile yapılandırıldı. Proje görseli ve blog kapağı yükleme, admin önizleme ve public proje/blog render'ı uçtan uca doğrulandı. JPEG/PNG/WebP kabul; SVG/GIF ve 5 MB üstü red; magic-byte doğrulaması ve anonim presign reddi çalışıyor.
- Türk Telekom bağlantısında `*.r2.dev` TLS bağlantılarına ağ üzerindeki bir ara cihazın müdahale ettiği kanıtlandı (TLS yanıtı yerine ara cihazdan gelen HTTP yönlendirmesi). Uygulama, R2, CORS ve CSP kök neden olmadığı doğrulandı.
- Yalnız development'ta çalışan aynı-origin medya uç noktası `GET /api/media/r2` eklendi (`src/app/api/media/r2/route.ts`, `src/features/media/delivery-url.ts`). Production'da 404 döner; görseller doğrudan R2 public adresinden yüklenir. Uç nokta yalnız yapılandırılmış `R2_PUBLIC_BASE_URL` origin'ine ve `projects|blog/<uuid>/<uuid>.(jpg|png|webp)` anahtar biçimine izin verir, içerik türünü allowlist'e göre yeniden denetler ve `no-store` + `nosniff` ile döner.

### Tests
- `tests/media-delivery.test.ts`: development proxy URL dönüşümü ve anahtar/origin allowlist birim testleri.

Final kapılar: unit 118/118, security unit 7/7, security HTTP 8/8, tam HTTP 129/129; lint, typecheck ve production build başarılı; `local.db` korundu, integrity `ok`.

## [1.8.2] — Admin RSC/page-segment authorization hardening (2026-10-02)

### Security
- **CRITICAL düzeltme:** Admin yetkilendirmesi yalnız `(protected)` layout'undaydı; anonim istek `/admin/login`'e yönlendirilirken paralel render edilen sayfa segmenti özel veriyi HTML/RSC gövdesine yazabiliyordu. `(protected)` altındaki 15 sayfanın tamamı artık veri çekmeden önce `await requireAdmin()` çağırır. Ayrıntılar [SECURITY](SECURITY.md).
- Admin JSON gövdeleri 1 MiB ile sınırlandı (`src/features/security/read-json.ts`); okuma yetkilendirmeden sonra yapılır.
- `.gitignore` açıkça `.local-backups/`, `*.sqlite*`, `*.db-journal` ve `.claude/settings.local.json` dışlar.

### Tests
- `tests/phase5-http.mjs`: anonim admin HTML/RSC yanıt gövdelerinde taslak verisi bulunmadığını doğrulayan regresyon (güvenlik açığı varken başarısız olduğu doğrulandı).
- `tests/phase5-security.test.ts`: sınırlı JSON okuyucu birim testi.

### Docs
- README: gizli veri/`local.db`/yedek dışlama, varsayılan admin parolası olmadığı, migration, tam regresyon komutu ve R2'nin opsiyonel olduğu belgelendi. `.env.example` R2 bölümünü opsiyonel olarak işaretler.

Final kapılar: unit 116/116, security 7/7, tam HTTP 129/129 (Phase 5 güvenlik 8/8), lint, TypeScript, build başarılı; npm audit 0 zafiyet.

## [1.8.1] — Final yerel QA / release candidate (2026-09-30)

- Web ve PDF CV'de kodlanmış Unicode sosyal bağlantılarının görünen metni okunur hâle getirildi; bağlantı hedefi güvenli kodlanmış URL olarak kalır.
- R2 ayarları yokken proje ve blog medya yükleme kontrolleri pasif olur, açıklayıcı durum gösterir; presign API 503 ve anlaşılır mesaj döner.
- Birim, güvenlik, tam yerel HTTP, lint, TypeScript, üretim derlemesi, audit ve ayrı DB üzerinde Drizzle migration geçti. Görsel QA kapsamı ve açık manuel doğrulamalar [UX_PHASE_REPORT](UX_PHASE_REPORT.md) ile [TEST_LOG](TEST_LOG.md) içinde.


## [1.8.0] — Phase 18 Certificates (2026-09-30)

### Added
- Eklemeli `certificates` tablosu/migration; admin oluşturma, düzenleme, silme, görünürlük, CV görünürlüğü ve sıralama.
- Görünür kayıtlar için Data Spine üzerinde sıralı landing bölümü; web/PDF CV'de `isVisible && showInCv` sertifikaları.
- Sertifika doğrulama URL'si ve tarih doğrulaması, public okumada güvenli URL denetimi, Phase 18 unit/HTTP testleri.

### Changed
- Contact bağlantı metni ile dekoratif branch/node arasındaki yatay boşluk ayarlandı.
- Yerel Drizzle komutları `.env.local`/`.env` yükler; mevcut süreç değişkenleri önceliklidir ve boş local auth token isteğe bağlı kabul edilir.

Final kapılar geçti: unit 114/114, security 6/6, tam HTTP 126/126 (Phase 18: 12/12), lint, TypeScript ve build başarılı; npm audit 0 zafiyet.

## [1.7.0] - Phase 17 native pinned branch scenes - 2026-09-27

### Changed
- Projects, Journey, Blog, CV landing, GitHub ve Contact: outer native scroll range + inner sticky scene. Step sayısı gerçek render edilen item sayısından; mesafe viewport/mobile/section ağırlığına göre hesaplanır.
- Açık traveling/enteringHub/pinnedSequence/leavingHub modeli; pin boyunca core hub'da, çizgiler hub'dan draw ve birikimli item reveal. Reverse aynı progress'i geri alır; son %12 settle/release alanı.
- Sticky offset SVG route/core/branch koordinatlarına birlikte uygulanır; mevcut sample buffer yerinde deforme edilir. Yeni canvas, wheel interception veya React scroll state yok.
- Kısa viewport/tall-content/reduced-motion: extra scroll ve sticky bypass, tüm item'lar görünür. Hero/Skills ve standalone motifler pin almaz.
- İlk URL hash, enhancement sonrası scene başlangıcına bir kez hizalanır; pin sırasında indicator etiketi ve local fill korunur.

### Verified
- Unit 104/104, security 6/6, tam HTTP 114/114; final ilgili HTTP 26/26; lint/TypeScript/build başarılı, audit 0.
- Education üç item, desktop Projects/GitHub/Contact, reverse/release, PageDown/Space, 375/390 px, 719x449 short viewport ve uygulama reduced-motion browser'da doğrulandı.
- Live DB hash korundu, timestamp backup integrity ok. OS media emülasyonu, gerçek Safari/touch/scrollbar drag ve FPS ölçümü yapılmadı.

Bu proje [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) başlık
yapısına yakın, tarih bazlı bir kayıt tutar.

## [1.6.0] — Phase 16 hub-centered sequential branches - 2026-09-27

### Changed
- Projects, Timeline, Blog, CV landing, GitHub ve Contact dalları doğrudan kendi local hub koordinatından başlar. Mobilde aynı köken, dar bir elbow yolu kullanılır.
- White core önce hub'a ulaşır ve item sırası bitene kadar hub'da kalır. Scroll progress önce branch'i çizer, ardından item vurgusunu artırır; geri scroll sıralamayı geri alır.
- Landing item'ları ayrı Anime reveal yerine mevcut spine rAF'ından beslenir. Standalone secondary motif, hover/focus ve okunabilir reduced-motion korunur.
- Deep-link/resize arrival latch ve StrictMode sonrası geciken font callback'inin SVG gruplarını yeniden oluşturması düzeltildi.

### Verified
- Unit 97/97, security 6/6, tam HTTP 106/106; son DOM düzeltmesi sonrası Phase 15/16 HTTP 18/18. Lint, TypeScript, build başarılı; audit 0.
- Desktop ve 375/390 CSS px browser; üç eğitim fixture'ı, gerçek GitHub repo satırları, Contact pointer hit-test, uygulama reduced-motion ve console kontrolü.
- Live DB hash'i korundu; test DB'leri temizlendi. OS motion emülasyonu, tam hover matrisi ve FPS/physical-device ölçümü yapılmadı.

## [1.5.0] — Phase 15 Data Spine polish - 2026-09-27

### Changed

- Scroll ile rota üzerinde hareket eden beyaz core; Hero başlangıç beklemesi, hub arrival ile section/branch/content vurgusu ve core ile senkron sağ indicator/progress.
- Hero mikrocopy kaldırıldı; devam linki, global hover/focus dili, Timeline/GitHub item branch'leri, mobil ve reduced-motion polish korundu.
- `/projects`, `/blog`, `/cv` dekoratif SecondarySpine; CV grid/background sakinleştirildi, print dekoru kapalı.
- Yarım kalan Phase 15 kodu incelendi; çalışan görsel uygulama yeniden yazılmadı. `phase15-http` tam regresyon listesine eklendi.

### Validation

- Lint/TypeScript/build exit 0, unit 90/90, security unit 6/6, disposable DB HTTP 97/97, audit 0 açık. Sürüm yalnız bu kapılar geçtikten sonra yükseltildi.
- Desktop ve 375/390 CSS px browser kontrolü; canlı DB hash'i korundu. Gerçek OS reduced-motion emülasyonu ve tüm hedeflerde gerçek hover doğrulaması araç sınırı nedeniyle bekliyor; uygulama hareket azaltma anahtarı ve klavye focus'u doğrulandı. Ayrıntı: `UX_PHASE_REPORT.md`, `TEST_LOG.md`.

## [1.4.0] — Continuous Data Spine - 2026-09-27

### Changed

- Data Spine yeniden yorumlandı: section'a göre poz değiştiren tek obje yerine **hero'dan contact'a kadar sayfa boyu tek, sürekli rota**. Rota DOM'dan ölçülen lane/hub noktalarından geçen tek bir centripetal Catmull-Rom spline'dır (2048 örnek, doküman uzayında); scroll yalnız görüş penceresini kaydırır, omurga hiçbir section'da yeniden kurulmaz.
- Landing düzeni referans görsele göre iki kolon + orta omurga şeridine (lane) geçti; lane konumu section'dan section'a zig-zag yapar, içerik kolonları omurganın iki yanına dizilir. Chapter cue'ları `02 // PROJELER` biçiminde, render edilen section sırasına göre numaralanır.
- Projects kartları kompakt yatay satırlar; Blog kartları tek ray üzerinde küçük kartlar; GitHub repo paneli ve Contact link paneli omurgaya bağlı paneller.
- Mobil/tablet (<56rem): aynı tek rota sol kenar şeridinde; içerik kısa yatay branch'lerle bağlanır.
- Skill Universe başlangıç ekseni artık dikey (`SKILL_AXIS_LEAN`), sayfa omurgasının devamı olarak.
- `phase13-spine.test.ts` sürekli rota sözleşmesiyle yeniden yazıldı (14 test); Phase 11/13 HTTP beklentileri yeni SSR işaretlemesine uyarlandı.

### Added

- `buildSpineRoute`, `routeControls`, `catmullRom`, `routePoint`, `routeXAt`, `routePathData`, `branchPath`, `hubActivation`, `revealHead` (saf matematik, `data-spine.ts`).
- `DataSpine` istemci bileşeni (ölçüm + SVG iz/branch katmanı + lazy WebGL), `data-spine-renderer.ts` (rota float texture'da; strand/ağ/uydu/sinyal/hub halo/orbit halkaları shader'da hesaplanır, 3 draw call), `SpineLane` / `SpineAnchor` sunucu bileşenleri.
- Hub aktivasyonu (viewport ortasına yakın hub parlar, bağlı branch/anchor'lar vurgulanır) ve hafif progressive reveal.
- Phase 14 HTTP testi (8 kontrol).

### Removed

- Section-local spine state'leri (`spineStates`, `spineTarget`, mobile override tabloları, `projectsBand`, `connectorStrength`), eski `data-spine-scene.tsx`, CSS `.spine-fallback` silüeti ve section'a göre yer değiştirmesi, Projects kart önizleme/chapter cue parallax transform'ları.

## [1.3.0] — Data Spine Public Experience - 2026-09-27

### Added

- Data Spine (veri omurgası + mühendislik izi): tek prosedürel omurga; eksen, node, orbit halka, strand, uydu ağı ve sinyal katmanları.
- `data-spine.ts` state/config (7 state, mobile override), lerp/damp, projects band, connector ve skill emergence yardımcıları.
- Projects kart anchor'ları ve SVG spine connector'ları; Skill Universe'in spine ekseninden ağa açılması.
- CSS Data Spine fallback; 12 unit ve 6 HTTP kontrolü.

### Changed

- Hero merkeze yakın başlar; section bazlı yoğunluk; Timeline sade dikey yol; Blog/CV düşük yoğunluk; Contact arka plan dekoru ve copy polish.
- Footer yalnız isim + © (public ve CV layout). Background grid/ışık sakinleştirildi.
- Reduced motion aktif section'a statik snap yapar.

### Removed

- Küre/lattice narrative sahnesi, kullanılmayan Phase 6 hero sahnesi ve landing background bileşeni, ilgili CSS ve `sceneQuality`.

### Fixed

- 30 fps cap'li render döngüsünün ilk frame'i çizmemesi (geliştirme sırasında bulundu).

## [1.2.0] — Scroll-driven Public Experience - 2026-09-26

### Added

- Tek prosedürel primary obje ve beş scroll-controlled morph formu.
- Section state/config yardımcıları, mutable narrative store ve tek scroll controller.
- Native chapter navigasyonu/progress, SSR CSS fallback ve kullanıcı hareket azaltma seçimi.
- 7 narrative unit ve 4 HTTP progressive-enhancement/regresyon kontrolü.

### Changed

- Hero, About, Projects, Skill Universe, eğitim-deneyim Timeline ve Contact görsel akışı.
- Mobile tier, runtime reduced-motion, on-demand primary rendering ve lifecycle cleanup.
- Palette mobil erişilebilir ismi ve journey section ID tutarlılığı.
- Public-only CSS; backend/schema/auth/admin/CV/CRUD/deployment değişmedi.

## [1.1.0] — UX & CV Polish - 2026-09-26

### Added

- Opsiyonel görünürlük kontrollü telefon; güvenli tel URI.
- Instagram/Behance/Dribbble ve link başına ayrı CV görünürlüğü.
- Yerel OFL lisanslı Noto Sans PDF fontları ve Unicode testleri.
- Section-aware fixed scroll background; reduced-motion statik fallback.

### Changed

- Hero kısa tanıtımı / Hakkımda / CV özeti ayrımı; Kısa Profil kaldırıldı.
- Timeline yalnız eğitim-deneyim; eğitim programı opsiyonel.
- CV-only layout sosyal bağlantıları shell/RSC seviyesinde de filtreler.
- Tek kolon CV typography/spacing; Terminal header'da, sade footer.
- Mevcut veri korunarak üçüncü additive migration uygulandı; varsayılan CV linkleri GitHub/LinkedIn/Website.
- Academic belgeler güncellendi; cloud/deploy hâlen ertelendi.

## [1.0.0] — Academic Final - 2026-09-26

### Added

- `docs/FINAL_REPORT.md`, `USER_GUIDE.md`, `DEVELOPER_GUIDE.md`,
  `DEMO_SCRIPT.md`, `PRESENTATION_OUTLINE.md`, `SCREENSHOT_PLAN.md` ve
  `FINAL_STATUS.md` final akademik teslim seti.
- Kodla birebir uyumlu final sistem mimarisi ve ER diyagramları; rapor içi
  görsel yer tutucuları ve manuel screenshot planı.

### Changed

- README kısa final proje vitrini olarak yeniden düzenlendi.
- `ARCHITECTURE.md` ve `PROJECT_REPORT.md` içindeki Phase 7–8 öncesinden kalma
  GitHub, palette, terminal ve Social CRUD ifadeleri güncellendi.
- Feature freeze altında yalnız dokümantasyon, test ve teslim temizliği yapıldı;
  yeni feature, servis veya migration eklenmedi.

### Security

- Admin auth/origin, public DTO, `javascript:` URL, draft/private repository,
  CV privacy, CSP, secret isolation, upload ve terminal eval sınırları final
  regresyon incelemesinden geçirildi; yeni açık regresyon bulunmadı.
- `.tmp-phase2-test.db` ve `phase8-test.db` atıl local test veritabanları
  kaldırıldı; `testvars.sh`, gerçek `.env`, credential veya log kalıntısı yok.

### Documentation

- Akademik rapor; Özet/Abstract, teknolojiler, güvenlik, performans,
  erişilebilirlik, testler, problemler, deployment planı, sınırlar, kaynakça ve
  ekleri tek tutarlı kaynakta birleştirdi.
- Kullanıcı, geliştirici, demo, sunum, screenshot, ZIP ve teslim checklist'leri
  hazırlandı.

### Testing

- Final yerel sonuç: lint ve TypeScript başarılı; unit 63/63; güvenlik 6/6;
  Phase 2/3/4/5/7/8 HTTP grupları 9/9, 12/12, 18/18, 7/7, 8/8 ve 10/10;
  production build başarılı; `npm audit --audit-level=low` 0 bulgu.

### Known Limitations

- Production deployment, gerçek Turso/R2 smoke, HTTPS Secure cookie,
  production Lighthouse, fiziksel cihaz ve gerçek ekran okuyucu testi kullanıcı
  kararı/kapsam nedeniyle beklemededir.
- 2FA, password reset, CV versioning ve avatar upload gelecek geliştirmedir.

## [Unreleased] — Phase 8 (kısmi) - 2026-09-26

Sürüm 0.8.0'da bırakıldı: Phase 8 tamamlanma kriterlerinin bulut/deploy kısmı,
proje sahibinin sitenin public'e çıkmaması kararı nedeniyle uygulanmadı.

### Eklenen

- `/admin/social` Social Links CMS: ekleme, düzenleme, silme, görünür/gizli,
  yukarı/aşağı sıralama; `/api/admin/social-links`, `/[id]`, `/[id]/move`.
- `src/features/social/validation.ts`: platform enum'u, https-only URL
  normalizasyonu, GitHub profil URL zorunluluğu.
- `tests/phase8-social-links.test.ts` (3 unit), `tests/phase8-social-http.mjs`
  (10 HTTP kontrol grubu).
- Yıkıcı olmayan production araçları: `tests/phase8-production-smoke.mjs`,
  `tests/phase8-turso-smoke.mjs`, `tests/phase8-r2-smoke.mjs` (çalıştırılmadı).
- `docs/DEPLOYMENT.md` uygulanabilir deployment rehberine dönüştürüldü
  (env scope tablosu, rollback, backup, hata modları).

### Değiştirilen

- Admin navigasyonuna "Social" eklendi.

### Güvenlik

- Social link URL'leri admin API'de https dışı her şemayı reddeder.
- Bulut hata modunda (Turso erişilemez) yanıt ve log'larda sızıntı olmadığı local
  production build ile ölçüldü.

## [0.8.0] - 2026-09-26

### Eklenen

- `Ctrl+K` / `Cmd+K` global komut paleti: public sayfalar, yayınlanmış projeler,
  son yazılar, CV PDF, GitHub, görünür sosyal bağlantılar ve terminal komutu;
  ad/anahtar kelime/grup filtresi, combobox erişilebilirliği, lazy chunk.
- Terminal easter egg: `help`, `about`, `projects`, `skills`, `blog`, `cv`,
  `contact`, `github`, `clear`; bellek içi ↑/↓ geçmiş, `role="log"` çıktı.
- Landing GitHub bölümü: server-side public REST API, Zod DTO, 6 saat
  `unstable_cache`, 4 s timeout, profil bağlantısı fallback'i, opsiyonel
  `GITHUB_USERNAME`/`GITHUB_TOKEN` (`.env.example`).
- Project detail: meta şeridi (rol/tarih/durum/teknoloji), canlı proje ve kaynak
  kod CTA'ları, private repository rozeti, yalnız dolu bölümler için "Bu sayfada"
  navigasyonu, paragraf/liste ayrıştırmalı mimari paneli, erişilebilir galeri
  lightbox'ı.
- Mobil menü (`aria-expanded`), route bazlı `aria-current`, public footer
  (ad, linkler, CV, GitHub, dinamik yıl, terminal), özel 404 sayfası.
- Ortak native `<dialog>` tabanlı `ModalDialog` (focus trap, Escape, backdrop,
  focus restoration, dekoratif canvas pause sinyali).
- `tests/phase7-developer-experience.test.ts` (11 unit test),
  `tests/phase7-seed.mjs` ve `tests/phase7-http.mjs` (8 HTTP kontrol grubu).

### Değiştirilen

- Header/footer root layout'tan `(public)/layout.tsx` ve `admin/layout.tsx`'e
  taşındı; admin görünümü korunur, public dialog/veri kodu admin'e girmez.
- Ana navigasyondaki Blog bağlantısı `/#blog` yerine `/blog` rotasına gider.
- İletişim bölümü kanal türü etiketli liste olarak sadeleştirildi.
- Hero ve Skill Universe render loop'u açık modal sırasında frame istemez.
- Sürüm 0.8.0'a yükseltildi. Yeni runtime dependency ve migration yoktur.

### Düzeltilen

- Public CV/site DTO'su artık `https:` olmayan sosyal bağlantıları döndürmez
  (`javascript:` URL RSC payload'ında taşınıyordu; React render'da engelliyordu).
- Mobil görünümde ana navigasyona erişilemiyordu (menü yoktu).

### Güvenlik

- Terminal sabit registry dispatcher'ıdır; eval/Function/shell/network yoktur.
- Palet/terminal/footer hedefleri internal path veya https allowlist'inden geçer.
- GitHub token yalnız server-side; client chunk taramasında bulunmadı.
- CSP gevşetilmedi; `connect-src 'self'` korunur, GitHub avatarı kullanılmaz.
- CMS'de private işaretli repository'ler GitHub listesinden çıkarılır.

## [0.7.0] - 2026-09-24

### Eklenen

- Anime.js 4.5.0 ile merkezi reveal, hero stagger ve scroll-linked timeline çizgisi.
- Vanilla Three.js 0.186.0 ile prosedürel constellation Hero ve gerçek public
  skill verisine dayalı Skill Universe.
- WebGL2 fallback, reduced-motion statik kademe, mobile/tablet/desktop kalite
  kademeleri ve 1/1.25/1.5 DPR üst sınırları.
- Minimum public Skill Universe DTO'su, erişilebilir HTML skill listesi ve gerçek
  eğitim/deneyim/yayınlanmış projelerden Career Timeline.
- Kalite, DPR, timeline ve public skill DTO için 5 unit test.

### Değiştirilen

- Landing akışı Hero, About, Projects, Skills, Journey, Articles, CV ve Contact
  olarak olgunlaştırıldı; profil metni mümkün olduğunda public CV DTO'dan gelir.
- Project hover/reveal genişletildi; blog detail ve `/cv` ağır animasyon dışında kaldı.
- Three sahneleri yalnız landing'de `next/dynamic({ ssr: false })` ile lazy yüklenir.
- Sürüm 0.7.0'a yükseltildi; `animejs`, `three` ve Three tipleri eklendi.
  Veritabanı şeması/migration değişmedi.

### Güvenlik

- CDN/external script, `dangerouslySetInnerHTML`, runtime eval veya yeni CSP
  istisnası eklenmedi.
- Skill client DTO'su yalnız id/slug/name/category/public project count taşır.
- Phase 5 production CSP testi geçti; production `unsafe-eval` ve wildcard
  içermemeye devam eder.

## [0.6.0] - 2026-09-24

### Eklenen

- Production/development ayrımlı Content Security Policy ve production HSTS.
- Custom admin mutation'ları için ortak exact-origin / Fetch Metadata kontrolü.
- R2 finalize akışında ilk 16 byte Range GET ile JPEG/PNG/WebP magic-byte
  doğrulaması.
- Production protocol/localhost/secret/token kontrollerini genişleten runtime
  environment validation.
- `tests/phase5-security.test.ts` (6 unit/security test) ve
  `tests/phase5-http.mjs` (7 gerçek HTTP güvenlik grubu).
- R2 exact-origin CORS örneği ve before/after deploy kontrolleri içeren
  `docs/DEPLOYMENT.md`.

### Değiştirilen

- `next/image` R2 remote pattern'i `/projects/**` yanında `/blog/**` ile
  sınırlandırılmış biçimde genişletildi.
- Admin/auth route'ları ve PDF response'ları public cache'e karşı `no-store`
  olarak sertleştirildi.
- Unknown server hataları ve R2 cleanup log'ları credential/internal ayrıntı
  taşımayan context + error type biçimine indirildi.
- Package sürümü 0.6.0'a yükseltildi; yeni runtime dependency eklenmedi.

### Güvenlik

- CSP object/embed/frame kullanımını kapatır; base/form scope'u self, image
  kaynağı self/data/blob ve yapılandırılmış R2 HTTPS origin'i ile sınırlıdır.
- Production CSP wildcard/`unsafe-eval` içermez. Nonce, bütün uygulamayı dynamic
  yapmamak için bilinçli olarak kullanılmadı.
- R2 MIME/size metadata kontrolüne gerçek binary signature doğrulaması eklendi.
- Sentinel build client-bundle taraması ve npm audit sıfır bulgu verdi.
- Gerçek Turso/R2 cloud ve deployed HTTPS cookie testleri credential/environment
  olmadığı için dürüstçe pending tutuldu.

## [0.5.0] - 2026-09-23

### Eklenen

- Admin Profile yönetimi (`/admin/profile`): ad/unvan/biyografi/konum/e-posta
  ve görünürlük anahtarları.
- Admin Education CRUD (`/admin/education`): ekleme, düzenleme, silme,
  yukarı/aşağı sıralama; sunucu tarafında `isCurrent`/tarih tutarlılığı.
- Admin Experience CRUD (`/admin/experience`): aynı desen, deneyim opsiyonel.
- Admin Skills CRUD (`/admin/skills`): gerçek isim + kategori bazlı yetenek
  kataloğu; percentage/skill-bar sistemi yok.
- Admin CV ayarları (`/admin/cv`): CV başlığı, dil (TR/EN), özet override,
  bölüm sırası/görünürlüğü (basit yukarı/aşağı), azami proje sayısı.
- Public `/cv`: tek veri kaynağından (`getPublicCvData()`) üretilen, boş
  bölümleri render etmeyen, semantik web CV.
- `GET /api/cv/pdf`: `@react-pdf/renderer` ile tamamen server-side (Node.js
  runtime) üretilen, A4/tek kolon/Helvetica/metin tabanlı ATS-first PDF CV.
- Site içi deterministik "ATS Uyumluluk Kontrolü" (`src/features/cv/ats-rules.ts`,
  12 kural) ve admin CV ekranında 0-100 skor + geçti/uyarı/başarısız listesi.
- `projects.include_in_cv` alanı ve mevcut published/featured toggle deseniyle
  aynı admin akışı; CV'ye dahil edilecek projeler buradan işaretlenir.
- `tests/cv-validation.test.ts`, `tests/ats-rules.test.ts` (20 yeni unit test)
  ve `tests/phase4-http.mjs` (18 gerçek HTTP entegrasyon/güvenlik testi).
- Bağımlılıksız, yalnızca Node'un `zlib` modülünü kullanan minimal PDF metin
  çıkarım yardımcısı (`tests/pdf-text-extract.mjs`) — PDF'in gerçekten metin
  tabanlı (seçilebilir/aranabilir) olduğunu otomatik doğrulamak için.

### Değiştirilen

- Admin shell navigasyonuna Profile/Education/Experience/Skills/CV eklendi.
- Landing page'e gerçek veriden beslenen bir CV teaser bölümü ("CV'yi
  görüntüle" / "PDF indir") eklendi.
- `primaryNavigation`'a `/cv` bağlantısı eklendi.
- `src/server/projects/repository.ts` `listPublicProjects` fonksiyonuna
  `includeInCv` filtre seçeneği eklendi (CV projeleri için mevcut public
  proje sorgusu yeniden kullanıldı, ikinci sorgu yazılmadı).
- Ortak `toSlug`/MIME sabitleri paylaşımı `src/features/cv/validation.ts`
  üzerinden genişletildi.
- README ve tüm yaşayan teknik belgeler Phase 4 gerçek durumuna güncellendi.

### Şema / Migration

- Yeni migration (`drizzle/20260923190657_phase4_cv_additions`): `profiles.is_location_visible`,
  `projects.include_in_cv`, `cv_settings.max_projects` — üç additive kolon,
  eski migration değiştirilmedi.

### Güvenlik

- Profile/Education/Experience/Skills/CV settings mutasyonlarının tamamı
  admin authorization'ı tekrar doğrular.
- Gizli e-posta/konum, yayınlanmamış/CV-dışı proje ve gizli yetenek public
  CV DTO'suna hiçbir zaman girmez (sorgu seviyesinde filtrelenir, CSS ile
  gizlenmez).
- PDF response header'ı (`Content-Disposition`) yalnızca `toSlug()` çıktısından
  üretilir; header injection yapısal olarak imkânsızdır.
- PDF şablonu metin tabanlıdır, harici görsel/script içermez, avatar/fotoğraf
  ana ATS şablonuna dahil edilmez.
- ATS skoru, gerçek bir işveren ATS sisteminin sonucu olmadığı hem UI'da hem
  dokümantasyonda açıkça belirtilerek sunulur.
- CSP, Phase 3'te olduğu gibi bilinçli olarak pending bırakıldı.

## [0.4.0] - 2026-09-23

### Eklenen

- Admin Blog CMS: `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]/edit`,
  `/admin/blog/categories` — liste, oluşturma, düzenleme, silme, publish/unpublish.
- Tiptap 3.31.3 tabanlı rich-text editör (`@tiptap/react`, `@tiptap/pm`,
  `@tiptap/starter-kit`, `@tiptap/extension-link`); H1 hariç, emojisiz metin
  tabanlı erişilebilir toolbar.
- Allowlist tabanlı Tiptap JSON doğrulayıcı (`src/features/blog/content-schema.ts`)
  ve `dangerouslySetInnerHTML` kullanmayan elle yazılmış public renderer
  (`src/features/blog/render-content.tsx`).
- Kategori CRUD ve etiket find-or-create akışı (`post_tags` many-to-many).
- Blog cover için Project CMS ile aynı R2 presign/finalize güvenlik akışının
  genelleştirilmiş (`scope`/`resourceId`) hâli.
- Public `/blog`, `/blog/[slug]`, dynamic SEO metadata ve landing page
  "Latest Articles" bölümü.
- Draft/published ayrımı, otomatik `publishedAt` ataması ve public sorgu/DTO
  ayrımı.
- `tests/post-validation.test.ts` (18 unit test) ve `tests/phase3-http.mjs`
  (12 gerçek HTTP entegrasyon/güvenlik testi).

### Değiştirilen

- Admin shell navigasyonuna Blog eklendi.
- `src/server/storage/upload-token.ts`, tek `projectId` alanı yerine genel
  `scope`/`resourceId` alanlarını taşıyacak şekilde genelleştirildi (Project
  CMS route'ları aynı güvenlik garantileriyle güncellendi).
- Ortak MIME/size sabitleri `src/features/media/validation.ts`'e taşındı;
  Project validation bu modülü re-export eder.
- README ve tüm yaşayan teknik belgeler Phase 3 gerçek durumuna güncellendi.

### Güvenlik

- Rich-text içerik yazma yolunda allowlist dışı düğüm/mark/link protokolü
  (`javascript:`, `data:`, `vbscript:`, `<script>`, `image`, `iframe`) HTTP 400
  ile reddedilir; veritabanına asla yazılmaz.
- Public render `dangerouslySetInnerHTML` kullanmaz; XSS riski JSON →
  controlled server renderer yaklaşımıyla formal olarak önlenir.
- Blog mutasyonlarının tamamı (`create/update/delete/state/cover`) admin
  authorization'ı tekrar doğrular.
- CSP, JSON-LD structured data ve gerçek R2 blog cover smoke testi bilinçli
  olarak pending bırakıldı (bkz. SECURITY.md).

## [0.3.0] - 2026-09-23

### Eklenen

- Admin Project CMS: liste, oluşturma, düzenleme, silme, publish ve featured.
- Zod tabanlı server whitelist validation ve project/skill transaction'ları.
- Server-only Cloudflare R2 S3 client, 5 dakikalık presigned PUT ve HMAC finalize.
- R2 `HeadObject` MIME/exact size/5 MB doğrulaması ve başarısız upload cleanup.
- Cover değiştirme/kaldırma, galeri yükleme/kaldırma ve yukarı/aşağı sıralama.
- Public `/projects`, `/projects/[slug]`, featured landing ve dynamic metadata.
- Public/admin query ayrımı ve private repository URL SQL redaction'ı.
- Next Image için env kaynaklı dar HTTPS `/projects/**` remote pattern.
- Unit ve gerçek HTTP entegrasyon test araçları.

### Değiştirilen

- Admin shell Dashboard/Projects navigasyonuna dönüştürüldü.
- Landing statik plan metninden database featured project seçkisine geçirildi.
- Public proje route'ları runtime DB kullandığı için repository lazy import edildi.
- README ve tüm yaşayan teknik belgeler Phase 2 gerçek durumuna güncellendi.

### Güvenlik

- Tüm mutation endpoint'lerinde session + admin rol kontrolü tekrarlandı.
- SVG/GIF reddi, MIME allowlist, 5 MB finalize sınırı ve server-generated UUID key.
- Project silmede explicit browser confirmation ve kontrollü media lifecycle.
- CSP, gerçek R2/CORS ve magic-byte taraması açık pending olarak korundu.

## [0.2.0] - 2026-09-23

### Eklenen

- Turso/libSQL server client ve environment doğrulaması.
- Drizzle ORM şeması, versioned migration ve generate/migrate/studio scriptleri.
- Profile, social links, education, experiences, skills, projects, project
  images, blog, media, CV settings ve site settings tabloları.
- Better Auth email/password, Drizzle Relations v2 adapter ve Admin plugin.
- Better Auth tarafından üretilen users, sessions, accounts, verifications ve
  kalıcı rate-limits şeması.
- Etkileşimli CLI tabanlı ilk admin bootstrap komutu.
- Gerçek login formu, sign-out işlemi ve korunan admin shell.
- Merkezi `requireAdmin()` session + rol kontrolü.
- Database tabanlı, login için beş istek/dakika rate limit.
- Mermaid ER diagram ve server/database veri akışı.

### Değiştirilen

- `/admin/login` devre dışı kabuktan gerçek Better Auth formuna geçirildi.
- `.env.example` yalnızca kullanılan Turso ve Better Auth değişkenlerine indirildi.
- README migration ve güvenli admin bootstrap adımlarıyla güncellendi.
- Database/auth import'ları build sırasında credential gerektirmeyecek şekilde
  runtime sınırına taşındı.

### Düzeltilen

- Drizzle 1.0 RC ile uyumsuz Better Auth Relations v1 şeması Relations v2 ile
  değiştirildi.
- Drizzle RC client API'sinde geçersiz olan eski `schema` bağlantı parametresi
  kaldırıldı.
- Stable Drizzle Kit'in development-server audit bulgusu, resmi RC kanalına
  geçilerek giderildi; son audit sıfır vulnerability bildirdi.

### Kaldırılan

- Artık kullanılmayan Phase 0 R2 environment placeholder'ları kaldırıldı; R2
  entegrasyonu kendi fazında eklenecektir.

## [0.1.0] - 2026-09-23

### Eklenen

- Next.js 16, React 19, TypeScript, Tailwind CSS 4 ve ESLint temeli.
- Responsive ve erişilebilir public landing page kabuğu.
- Kimlik doğrulama bağlanana kadar devre dışı yönetim giriş kabuğu.
- Space Grotesk, Geist ve JetBrains Mono tipografi sistemi.
- Temel güvenlik response header'ları ve `.env.example` şablonu.
- Yaşayan mimari, karar, güvenlik, test ve proje raporu belgeleri.

### Değiştirilen

- Varsayılan Create Next App ekranı proje kimliğine uygun koyu arayüzle değiştirildi.
- Varsayılan metadata Türkçe proje adı ve açıklamasıyla güncellendi.

### Düzeltilen

- İlk production build'de ağ kısıtı nedeniyle indirilemeyen fontlar, izinli ağ
  erişimiyle build tekrar edilerek doğrulandı.

### Kaldırılan

- Varsayılan demo bağlantıları ve logo kullanımı kaldırıldı.
