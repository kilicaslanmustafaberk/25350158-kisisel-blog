# UX Phase Raporu

## 1.8.3 — Güncel durum notu (2026-10-10)

1.8.3 arayüz tasarımını değiştirmez. Aşağıdaki 1.8.1 kaydındaki "R2 yapılandırılmamış, medya alanı pasif" maddesi tarihseldir: R2 artık gerçek bucket ile yapılandırılmış ve proje görseli/blog kapağı admin önizleme ve public render dahil doğrulanmıştır. Güncel sürüm ve test sayıları: Next.js 16.3.8, unit 118/118, security 7/7, tam HTTP 129/129 ([TEST_LOG](TEST_LOG.md)). Gerçek %200 zoom, OS reduced-motion emülasyonu, native print preview, fiziksel cihaz/Safari ve ekran okuyucu testleri hâlâ manuel doğrulama dışıdır.

## 1.8.1 — Final yerel release candidate QA (2026-09-30)

1. **Yedek:** Test öncesi `.local-backups/local-pre-final-qa-20260930-204214.db`; canlı ve yedek integrity `ok`. Canlı DB'ye seed/migration/test yazılmadı.
2. **Landing:** Gerçek veride Hero → Projects → Journey → Certificates → Blog boş durum → CV → GitHub → Contact → footer görüldü. Skills kayıt yokluğunda atlandı.
3. **Data Spine:** Tek rota/core, hub'da park eden pin, dal/öğe sırası ve doğal release desktop'ta görsel olarak doğrulandı; Journey ve Certificates ters scroll'da önce son öğeyi kapattı.
4. **Certificates:** Sekiz canlı kayıt var, ilk dört landing'de; desktop ve 375/390 CSS px'de yerleşim/metadata/doğrulama bağlantıları ve kademeli açılış temiz. Gizli kayıt canlı DB'de olmadığından bu filtre disposable HTTP testinde doğrulandı.
5. **Contact:** Altı satırda desktop ve mobil node–metin boşluğu 17 px; bağlantı dikdörtgenleri etkin, pin davranışı korundu.
6. **Hover/focus:** Gerçek klavye sıralamasında 18 öğede `:focus-visible`; palette ve terminal Escape odak döndürdü. Fiziksel pointer ile tam hover matrisi tamamlanmadı; ilgili CSS hover/focus eşleri incelendi.
7. **Sağ gösterge:** Journey, Certificates ve Contact etiketleri scroll/ters scroll ile eşleşti; stale etiket gözlenmedi.
8. **Reduced motion:** Uygulama anahtarında pin yüksekliği kalktı, Journey üç öğe görünür; OS `prefers-reduced-motion` emülasyonu araçta yoktu.
9. **Zoom:** 375/390 CSS viewport testleri geçti; gerçek tarayıcı %200 zoom değiştirilemedi ve eşdeğer sayılmıyor.
10. **Print:** `/cv` print CSS'de header/footer/dekor gizleme incelendi; IAB `Ctrl+P` native önizleme açmadığı için sayfa kırılımı ve görsel PDF kontrolü açık.
11. **Web/PDF CV:** Görünen telefon, Türkçe eğitim/sertifika ve sosyal linkler incelendi. Kodlanmış LinkedIn görünen metni düzeltildi; PDF 200/geçerli ve Türkçe/sertifika/telefon metni çıkarılabilir. Gizlilik filtreleri disposable HTTP testinde geçti.
12. **Standalone:** `/projects`, `/blog`, `/cv` Secondary Spine ve grid arka planı içerikle yarışmadı; yatay taşma yok.
13. **Boş durumlar:** Blog boş mesajı ölçülü; skills ve deneyim başlıksız atlandı. Sertifika sıfır ve GitHub fallback disposable test/kod ile doğrulandı.
14. **R2:** Yerel R2 ayarları eksik; admin medya alanı durum mesajı ile pasif, presign 503 açıklayıcı. R2 media upload yapılandırma gerektirir ve bilerek provision edilmedi.
15. **Drizzle:** `.env.local` `file:` URL'si token olmadan çözüldü; migration ayrı DB'de geçti, PowerShell env ataması normal yerel akış için gerekli değil.
16. **Console:** Kod tamamlandıktan sonra yeni temiz sekmede dört public route için error/warn 0 ve overflow yok. Hot reload esnasındaki geçici import hatası eski sekmede kalmıştı.
17. **Klavye:** Tab, Hero/sertifika/GitHub/Contact linkleri, palette/terminal ve Escape dönüşü çalıştı; screen reader kullanılmadı.
18. **Performans:** Bir canvas ve görünür duplicate loop yok; kaynakta visibility/RAF cleanup guard'ları mevcut. CPU/FPS ölçülmedi.
19. **Düzeltmeler:** CV URL görünen metni ve R2 yapılandırılmamış medya durumu; mimari/animasyon tasarımı değiştirilmedi.
20. **Unit:** 115/115.
21. **Security:** 6/6; HTTP auth/origin/privacy kontrolleri de geçti.
22. **HTTP:** Tam yerel regresyon 128/128 geçti; iki yeni R2 503 kontrolü dahil.
23. **Lint:** Exit 0.
24. **TypeScript:** Exit 0.
25. **Build:** Next 16.3.6 production build exit 0; 14/14 statik sayfa.
26. **Audit:** 0 zafiyet.
27. **Sürüm:** Küçük bugfix nedeniyle 1.8.1; package ve lock aynı.
28. **Belgeler:** Markdown QA, durum, değişiklik, kullanım, demo, sunum ve ekran planı güncellendi; Word/PPT/PDF teslimi yok.
29. **Ekran hazırlığı:** Güncel kadraj listesi [SCREENSHOT_PLAN](SCREENSHOT_PLAN.md) içinde; canlı `deneme` projesi ve boş blog/skills/deneyim akademik çekim öncesi içerik işi.
30. **Açık manuel işler:** Gerçek %200 zoom, OS reduced motion, native print preview, tam pointer hover, Safari/fiziksel touch, screen reader ve FPS ölçümü.


## 1.8.0 Phase 18 — Certificates ve Contact yerleşimi (2026-09-30)

Landing sayfası yalnız görünür sertifikalar varsa `#certificates` bölümünü ve sağ gösterge bağlantısını oluşturur. En çok dört kayıt, mevcut Data Spine üzerinde `data-spine-sequence` ve `data-spine-item` sırasıyla açılır; ek kayıtlar için CV bağlantısı yalnız CV'de gösterilecek kayıt da varsa çıkar. Başlık dışındaki boş alanlar ve doğrulama bağlantısı için boş yer tutucu üretilmez. Contact panelindeki yatay boşluk panel sol iç boşluğu ve bağlantı sol iç boşluğu ile ayarlandı; mevcut branch/node ve tıklanabilir bağlantı yapısı korundu.

Önceki geliştirme turunda aktarılan desktop, 375/390 CSS px ve yaklaşık 17–18 px Contact boşluğu bu turda yeniden ölçülmedi. Bu turdaki HTTP regresyonu Contact bağlantı/anchor yapısını ve PDF Türkçe metin çıkarımını doğruladı; tüm final kapıların sonucu [TEST_LOG](TEST_LOG.md) içinde.

## 1.7.0 - Phase 17 pinned branch scenes

Tarih: 2026-09-27. Kritik kabul: core hub'a gelir → native scroll ilerlerken inner viewport sabit → branch/item sırası → release. Backend/auth/admin/DB/privacy/CSP/CV-PDF kodlarına dokunulmadı.

1. **Mimari:** Outer native scroll height + inner CSS sticky; gerçek rendered item count ve measured fit.
2. **Travel/hub:** traveling/enteringHub/pinnedSequence/leavingHub modeli; pin boyunca core hub merkezinde.
3. **Education:** Üç eğitim örneği Ankara → Kocatepe → Cebeci sırasıyla açıldı; scene top yaklaşık 89 px sabit, sonra release.
4. **Projects:** Desktop kartlar cumulative progress ile sırayla; reverse doğrulandı.
5. **Blog:** Üç kart ortak sticky scene; ilk item aktifken sonraki0 browser'da görüldü; empty state tek SSR step.
6. **CV:** Tek item kısa pin; partial reveal sırasında viewport sabit. Standalone CV/PDF korunur.
7. **GitHub:** Landing'de görünen5 gerçek Octocat repo step sayısını belirler; publicRepoCount8 kullanılmaz. Desktop pin/PageDown doğrulandı.
8. **Contact:** Altı row kısa ağırlık; pin sırasında sıra, Space completion ve6 link hit-test başarılı.
9. **Reverse:** Aynı continuous local progress tersine; üçüncü education item önce kapanır, önceki item'lar kalır; core hub'da.
10. **Indicator:** Pin sırasında ilgili label sabit; local progress CSS fill'de. Travel mevcut core progress ile.
11. **Mobile:** 375/390 px overflow yok, education pin çalışıyor. Ekrana sığmayan uzun Projects/Blog/GitHub fixture doğal flow bypass; CV/Contact enabled.
12. **Short/zoom:** 719x449 CSS viewport tüm pin bypass/tüm item görünür. Gerçek 200% browser zoom çalıştırılmadı.
13. **Reduced:** Uygulama toggle extra distance/sticky kaldırır, tüm item opacity1; nearest hub korunur. OS emülasyonu pending.
14. **Anchor:** İlk enhancement sonrası hash bir kez scene başlangıcına hizalanır; final journey reload item 0 / top 89 px. Sonraki anchor native.
15. **Pointer:** Contact6/6hit-test, dekor pointer-events none; focus-within item okunur.
16. **Performance:** Mevcut rAF/passive scroll, cached samples/DOM metrics, quantized CSS; yeni canvas/wheel intercept/React scroll state yok. FPS ölçülmedi.
17. **Unit:**104/104; 7 yeni meaningful test.
18. **Security:**6/6;  server security kodları değişmedi.
19. **HTTP:**114/114 full; final ilgili 26/26.
20. **Browser:** Desktop Education/Projects/GitHub/Contact/Blog/CV; reverse/release/PageDown/Space;375/390/short/reduced/hash; console error listesi boş.
21. **Lint:**exit 0.
22. **TypeScript:**exit 0.
23. **Build:**Final host production build exit 0, 13/13 static generation; ilk sandbox fontfetch hatası aşıldı.
24. **Audit:**0 vulnerability.
25. **Backup:**`.local-backups/local-pre-phase17-20260927-184022.db`; integrity ok, live hash aynı; yalnız disposable DB test edildi.
26. **Problemler:** Sticky offset çift ölçümü, CSS padding specificity, legacy marker adı çakışması, initial hash yerleşimi, sandbox fontfetch ve eski browser error tabı.
27. **Çözümler:** Natural ölçüm guard, doğru selector, data-pin-scene adı, initial hash alignment, cached route deformation, host build ve yeni acceptance tabı.
28. **Docs:**UX_PHASE_REPORT/TEST_LOG/CHANGELOG/FINAL_STATUS/ARCHITECTURE/DECISIONS; Word/PPT yok.
29. **Version:**Tüm otomatik gates ve browser kabulünden sonra 1.6.0 → 1.7.0; package/lock birlikte. Commit/push/deploy yok.
30. **Pending:**OS reduced-motion runtime emülasyonu, gerçek Safari/touch/scrollbar drag, gerçek 200% browser zoom, physical-device/FPS, tam hover matrisi ve print preview. Bunlar yapılmış sayılmaz.

Screenshot: `phase17-education-pinned.png` (yerel doğrulama görüntüsü; repository'ye dahil değil).

Cleanup: Bu fazın iki disposable DB’si ve tam adlı sidecar’ları kaldırıldı. Önceki fixture ve üç timestamp backup korundu; localhost:3100 kapalı, acceptance tabı kapatıldı ve viewport reset edildi.

---

# 1.6.0 — Phase 16 hub-centered sequential branches

Tarih: 2026-09-27. Public landing choreography tamamlandı; mevcut continuous spine, right indicator, hover/focus ve secondary motifs korunur. Sürüm 1.5.0 → 1.6.0. Backend/auth/admin/schema/security/CV-PDF değişmedi.

1. **Hub-centered branching:** Tüm alt branch path'leri gerçek local hub x/y noktasından başlar; hedef yüksekliğindeki spine telinden çıkmaz.
2. **White core → hub → item:** Core önce hub'a gelir, sequence bitene kadar park eder; her item için önce branch çizimi, ardından opacity/translate/border/anchor vurgusu gelir. Geri scroll sırayı geri alır.
3. **Timeline:** Eğitim ve deneyim aynı hub üzerinden item başına controlled spread alır. Üç eğitim fixture'ı Ankara Üniversitesi Nallıhan MYO → Kocatepe Mimar Kemal Anadolu Lisesi → Cebeci Ortaokulu sırasıyla browser'da doğrulandı. Canlı kayıtlar değiştirilmedi.
4. **Projects:** Kartlar aynı anda tam aktif olmaz. Browser'da birinci branch .919/item .822 iken sonraki hedef 0 ölçüldü.
5. **Blog:** Her kart/empty state kendi hub branch'ini alır; üç kart fixture'ı ile path/activation doğrulandı.
6. **CV landing:** Panelin tek branch'i ve gecikmeli item vurgusu var; browser .749 branch/.495 item ara durumunu yakaladı. Standalone CV/PDF değişmedi.
7. **GitHub:** Repo satırları hub'dan sıralı çağrılır. Gerçek beş Octocat reposunda ilk üç aktifken dördüncü branch .045, item 0 görüldü; istatistikler baseline okunabilir kalır.
8. **Contact:** E-posta, telefon, sosyal linkler ve CV linki ayrı kısa branch alır. Altı link pointer hit-test true; dekor pointer-events none, href/privacy sorguları korunur.
9. **Mobile:** 375/390 CSS px overflow yok. Ortak hub kökeni ve sequence korunur; dar elbow ve daha hafif stroke kullanılır.
10. **Reduced motion:** Uygulama anahtarı tüm item'ları opacity 1 tutar; white core nearest Journey hub'a park etti. OS media emülasyonu runtime yapılmadı.
11. **Performance:** Mevcut progress/rAF üzerinde cached numeric state, quantized CSS updates; yeni scroll listener veya scroll kaynaklı React state yok. Ayrı landing Anime clock kaldırıldı. FPS ölçümü yapılmadı.
12. **Security regression:** 6/6 security unit ve tam HTTP içinde auth/origin/private/hidden/phone/draft/terminal/CSP/PDF başarılı; ilgili server kodlarında değişiklik yok.
13. **Testler:** 97/97 unit, 106/106 tam HTTP; son lifecycle düzeltmesi sonrası ilgili HTTP 18/18. 7 yeni saf choreography testi ve 9 yeni SSR testi eklendi.
14. **Browser görsel doğrulama:** Desktop Projects/Timeline, 375/390 mobile, Blog/CV/GitHub/Contact, uygulama motion toggle ve console kontrolü. Screenshot: `phase16-timeline-sequence.png` (yerel doğrulama görüntüsü; repository'ye dahil değil). Console error listesi boş.
15. **Lint:** Son kaynak değişiminden sonra exit 0.
16. **TypeScript:** Son kaynak değişiminden sonra `tsc --noEmit`, exit 0.
17. **Build:** Son kaynak değişiminden sonra production build, 13/13 static generation, exit 0.
18. **Audit:** 0 vulnerabilities; dependency değişmedi.
19. **Problemler:** Deep-link/resize'da arrival latch kilitlenebiliyordu; StrictMode'dan kalan font-ready callback gerçek SVG gruplarını state'ten ayırıyordu; standalone HTTP assertion RSC props'tan false-positive üretti; fixture post kolon adı yanlıştı.
20. **Çözümler:** Restored/fast crossing/half-pixel arrival helper, disposal guards, gerçek DOM attr assertion ve `status='published'` query. Son browser/HTTP kontrolleri başarılı.
21. **Dokümanlar:** CHANGELOG, FINAL_STATUS, UX_PHASE_REPORT, TEST_LOG, ARCHITECTURE, DECISIONS güncellendi. Word/PPT üretilmedi.
22. **Yeni sürüm:** package.json/package-lock 1.6.0; commit/push/deploy yok.
23. **Pending:** OS reduced-motion emülasyonu, tam gerçek hover matrisi, browser print preview, physical-device/FPS ölçümü. Önceki phase'in bu doğrulama borçları devam eder; başarılmış gibi raporlanmaz.

Backup `.local-backups/local-pre-phase16-20260927-175041.db`, integrity `ok`; live DB ile SHA-256 aynı. Test/visual seed yalnız disposable DB'de. Yeni iki test DB temizlendi, eski fixture ve iki backup korundu; test server/browser kapatıldı.

---

# 1.5.0 — Phase 15 doğrulama ve yerel kapanış

Tarih: 2026-09-27. Önceki geliştirme turunun mevcut uygulaması korundu; yeni özellik/refactor/görsel yeniden tasarım yapılmadı. Tek kod değişikliği Phase 15 HTTP testinin `tests/local-regression.mjs` listesine eklenmesidir. Backend/schema/auth/CRUD/PDF sistemi değiştirilmedi.

## Veri koruması

Testlerden önce `.local-backups/local-pre-phase15-finalize-20260927-172300.db` oluşturuldu. Canlı dosya açık olduğundan salt okunur shared handle ile hash alındı; canlı ve yedek SHA-256: `9E1AE148AB01D5A6B047F679CCEE7481ADB97D1E1D748D0CEF7B2C0B9398A006`. Yedek `PRAGMA integrity_check`: `ok`. Canlı `local.db` üzerinde migration, seed veya destructive test çalıştırılmadı. Cleanup yalnız bu oturumun tam adlı disposable DB'sini hedefler; backup dizinine glob uygulanmaz.

## Kod ve browser bulguları

- Önceki turdaki 15 maddenin tamamının kod karşılığı mevcut: core/damping/hub arrival, indicator progress, Hero copy/devam et, hover/focus, item branch'leri, secondary motifler, CV sakinleştirme, mobile ve reduced-motion.
- Core Hero hub'ında başladı. Scroll sonrası Projects, Blog, GitHub, Contact; son fixture'da Timeline ve CV arrival/indicator eşleşmesi DOM üzerinden görüldü. İncelenen scroll geçişlerinde teleport/jitter görülmedi; kapsam tüm frame'ler için performans garantisi değildir. Layout/resize rotayı yeniden ölçüp core'u yeni hedefe park eder; olağan scroll'da rota yeniden kurulmaz.
- Sağ indicator 1440 CSS px'te görünür; aktif label/dot ve ilerleme çizgisi mevcut. Journey'de iki aktif branch ve `#journey`, CV'de `#cv`, Contact'ta `#contact` core context'iyle eşleşti. Mobil indicator gizli.
- Projects her kartta anchor, Timeline 2 öğe/2 tick anchor, GitHub repo satırlarında tick (ilk fixture gerçek public repo satırları), Blog/CV/Contact panellerinde bağlantı mevcut. Dekor input yakalamıyor; Contact linkleri gerçek href ve `pointer-events:auto` taşıyor.
- `/projects`, `/blog`, `/cv` ayrı browser navigation ile desktop ve 375/390 CSS px'te kontrol edildi: secondary motif içerikten geri planda; tümünde document horizontal overflow false. CV URL/telefon/özet okunabilir; grid metinle yarışmıyor. Print dekor gizleme kodda incelendi; bu oturumda browser print preview yapılmadı. PDF privacy/Unicode HTTP regresyonu geçti.
- Landing mobil Hero CTA/menu, Projects, Skills, Timeline/Blog ve Contact bağlantı yapısı kontrol edildi. Menu açılıp kapandı. 375/390 CSS px document overflow false. Araç viewport'u ölçeklediğinden gerçek `innerWidth`/`innerHeight` okunarak 375×812 ve 390×812 doğrulandı.
- Uygulama Hareketi azalt anahtarı `data-spine-motion=reduced` üretti; core nearest Skills hub'ına statik park etti, indicator `#skills`. CSS/renderer pulse/floating/time-stop kuralları incelendi. Bu, gerçek OS preference emülasyonu olarak raporlanmaz.
- Klavye Tab ile `focus-visible` ve görünür outline doğrulandı; global hover/focus kuralları kaynakta mevcut. Araç hover API'si ve media emülasyonu sunmadığından tüm button/nav/card/row hedeflerinde gerçek hover ve `prefers-reduced-motion: reduce` emülasyonu bekliyor.
- İncelenen browser oturumunda console error listesi boştu. Fiziksel mobil cihaz/GPU/FPS ve ekran okuyucu testi yapılmadı.

## Final kapılar ve sınırlar

Lint, `tsc --noEmit`, unit 90/90, security unit 6/6, tam HTTP 97/97 (önceki 88 + Phase 15 9), Next build ve npm audit (0 açık) başarılı. Unit ilk sandbox denemesi `uv_os_get_passwd ENOMEM`, audit ilk sandbox denemesi registry erişim hatası; host tekrarları başarılı. HTTP disposable DB ve `.next-test` kullanıldı, mevcut 3000 sunucusu durdurulmadı.

Sürüm 1.5.0. Yerel otomatik kapılar tamamlandı; yukarıdaki araçla yapılamayan görsel kontroller açık sınırlamalar olarak saklandı. Deployment/cloud/push/commit, Word/PPT üretimi yapılmadı. Önceki faz kayıtları aşağıda tarihsel bağlamdır.

Cleanup tamamlandı: yalnız bu oturumun `.phase10-1790519128642.db` ve tam adlı sidecar hedefleri kaldırıldı; 3100 fixture sunucusu kapandı, geçici browser kapatıldı ve viewport reset edildi. Önceki oturumun `.phase10-1790516260478.db` dosyasına dokunulmadı. Yeni backup mevcut; final canlı DB SHA-256 değeri başlangıç ve backup ile aynı.

# 1.4.0 — Sürekli Data Spine

Tarih: 2026-09-27. Yalnız public landing görsel/anlatı sistemi; backend, migration, auth/admin, CV/PDF, blog/proje mantığı, gizlilik/hidden repo kuralları, CSP ve terminal/palette güvenliği değişmedi. Deployment, remote veya cloud işlemi yapılmadı.

## Düzeltilen yanlış yorum

1.3.0'da tek bir WebGL sahnesi vardı ama omurga her section'da farklı bir yere/poza geçtiği için “hero'da bir omurga, projects'te başka, timeline'da başka” algılanıyordu. 1.4.0'da hedef; kullanıcının kaba çizimi (yapısal referans: tek kırmızı rota + turuncu hub'lar) ve masaüstündeki `referans.png` (görsel hedef: koyu mint teknik estetik, hub'dan kartlara branch'ler) izlenerek **hero'dan contact'a tek, kesintisiz rota** olarak yeniden kuruldu.

## Uygulama

1. **Tek rota mimarisi** — Her landing section'ı `data-spine-section` ve tek bir `SpineLane` (lane + hub) bildirir. `DataSpine` lane/hub konumlarını layout offset'lerinden (transform'dan bağımsız) ölçer; `buildSpineRoute` kontrol noktalarını (lane girişi → salınım → hub → salınım → lane çıkışı) centripetal Catmull-Rom ile tek spline'a çevirir ve 2048 eşit yay-uzunluğu örneğine yeniden örnekler.
2. **Hero** — Rota landing'in en üstünden başlar, ilk hub hero'da (%56 civarı), `01 // ANA SAYFA` caption'ına branch verir ve kesintisiz aşağı devam eder; bağımsız bir hero heykeli yoktur.
3. **Sayfa boyu süreklilik** — WebGL canvas viewport'a sabittir ama rota doküman uzayındadır; scroll yalnız görüş penceresini (`uView`) kaydırır. Geometri scroll'da yeniden kurulmaz, section'a göre poz değişmez. Lane'ler arası geçiş section padding'inde yumuşak S eğrisiyle olur.
4. **Hub'lar** — Her section'da bir hub (7 hub, en fazla 12): DOM'da keskin halka + çekirdek, WebGL'de halo, dönen orbit halkaları, hub çevresinde kalınlaşan tel demeti ve yoğunlaşan uydu bulutu. Viewport ortasına yakın hub `data-active` olur; bağlı branch ve anchor'lar parlar.
5. **Projects** — Başlık solda, kartlar sağda kompakt yatay satırlar; her kartın sol kenarındaki anchor'a Projects hub'ından yatay teğetli kübik branch gider. Kartlar HTML link olarak kalır.
6. **Timeline** — Yalnız eğitim + deneyim. Lane `calm`: salınım %25, kalınlık 0.45 — aynı rota burada sakin bir mühendislik izine döner; hub'dan timeline track'inin başına branch.
7. **Blog** — Başlık solda, kart rayı (veya boş durum) sağda; ray, Blog hub'ına bağlı. Boş durumda da anchor vardır.
8. **CV / GitHub** — CV aksiyon paneli ve GitHub repo paneli kendi hub'larından branch alır; GitHub artık yan dekorlu bağımsız blok değil, rotanın bir bölgesidir.
9. **Contact** — Rota son hub'dan geçip footer kenarına kadar iner ve sönümlenir; link paneli branch'le bağlı, içerik `z-index:2`, tüm dekor katmanları `pointer-events:none`.
10. **Footer** — Değişmedi: yalnız isim + ©.
11. **Mobil (<56rem)** — Aynı tek rota sol kenar şeridinde (x≈27px), 2 tel, 70 uydu, 36 sinyal, DPR 1, 30 fps; branch'ler rotadan içeriğe kısa yatay çizgiler; heading'ler içerikten önce gelir.
12. **Reduced motion** — Zaman donar (akış/salınım yok), reveal tüm rotayı eşit yakar, yalnız scroll'da tek çizim; yapı tamamen görünür kalır (OS tercihi `--force-prefers-reduced-motion` ile doğrulandı).
13. **Fallback** — WebGL2 yok / shader derleme hatası / context kaybı: SVG rota izi + branch'ler görünür kalır. JS yok: lane başına CSS çizgi ve hub'lar.

## Eski section-local yaklaşımdan farklar

| 1.3.0 | 1.4.0 |
| --- | --- |
| 7 section state'i (x, y, tilt, scale…) arasında lerp | Tek spline; section state'i yok |
| Omurga viewport'a göre konumlanıp her section'da yer değiştiriyordu | Omurga dokümana sabit; sayfa ile birlikte kayar |
| Projects'e özel “spine band” + ekran projeksiyonlu connector | Her section'da aynı hub → anchor branch mekanizması |
| CSS fallback silüeti section'a göre zıplıyordu | SVG fallback aynı rotanın kendisi |
| 6 draw call, CPU'da her frame geometri | 3 draw call, konumlar shader'da; scroll'da yalnız uniform |

## Doğrulama

- Unit **87/87** (Data Spine suite'i 14 teste yeniden yazıldı: rota sürekliliği/sıçramasızlık, geri dönmeme, hub'lardan tam geçiş, lane içinde kalma, calm Timeline, mobil şerit, bozuk/örtüşen lane dayanıklılığı, determinizm, hub aktivasyonu, reveal, branch path, quality tier, damping/skill emergence), security **6/6**.
- HTTP **88/88** (izole disposable DB): Phase 5/7/2/3/4/8/10/11/13/14 = 7+7+9+12+18+10+7+4+6+8.
- lint, TypeScript, Next.js build exit 0; `npm audit --audit-level=low` 0 vulnerability.
- Görsel: headless Chromium (SwiftShader WebGL) ile tam sayfa 1440×5200, 1024×4600, 390×7400 ve reduced-motion 1440×5200 ekran görüntüleri incelendi; rota hero'dan contact'a tek parça, hub'lar DOM halkalarıyla hizalı.
- Contact: 6/6 link, 3 noktada `elementFromPoint` ile kendisini döndürdü (1440 ve 390); dekor katmanları `pointer-events:none`; 390'da yatay taşma yok.

## Sınırlar

- Uygulama içi tarayıcı paneli gizli olduğu için canlı rAF animasyonu/FPS izlenemedi; görsel doğrulama headless yazılım WebGL'iyle yapıldı. Fiziksel cihaz, gerçek GPU FPS profili ve NVDA testi yapılmadı.

# 1.3.0 — Data Spine Public Experience

Tarih: 2026-09-27. Yalnız public landing görsel sistemi; yeni backend feature, migration, auth/admin/CV/CRUD, deployment, cloud veya remote değişikliği yok.

## Karar: Data Spine = veri omurgası + mühendislik izi

Küre ana anlatı objesi olmaktan çıkarıldı. Tüm landing boyunca yaşayan tek obje artık **Data Spine**'dır: eğimli, kontrollü S-kıvrımlı bir ana eksen; eksen boyunca node'lar, açık yay biçimli orbit halkaları, ekseni saran teller (strand), node'lardan açılan uydu ağı ve eksen/teller üzerinde akan düşük yoğunluklu sinyal noktaları. Sistem, bağlantı, yapı, üretim ve ilerleme fikrini taşır; dekoratif bir şekil değil, section işlevine bağlı dönüşen bir omurgadır. Eski küredeki “anlamsız şekil bozulması” yoktur: topoloji sabittir, yalnız eğrilik, kalınlık (girth), ağ açılımı, yoğunluk ve konum değişir.

## Uygulama

1. **Config mimarisi** — `src/features/motion/data-spine.ts`: `hero/about/projects/skills/timeline/archive/contact` state'leri; her biri x, y, depth, scale, tilt, yaw, pitch, curvature, spread, girth, node/wire density, ring/particle intensity, opacity, glow, anchor, flow hedeflerini taşır. Mobile override tablosu ve mobile çarpanları; dağınık magic number yok.
2. **Interpolation** — `narrativeFrame` (active section + scroll anchor blend, smoothstep) → `spineTarget` (iki state arası lerp) → renderer'da frame-rate bağımsız `damp` (λ=5.5). React state her frame güncellenmez; typed array, Three ref ve SVG attribute imperatif güncellenir. Unit test, sayfa boyunca 2px adımlarda hiçbir anahtarın sıçramadığını doğrular.
3. **Hero** — Merkeze yakın (x≈0.64) başlar, en zengin form (tam halka/tel/sinyal/glow). Scroll'la sağa ve derine (depth −1.4) çekilir.
4. **About** — sakinleşmiş form, sağda.
5. **Projects** — spine yatay-eğimli ince (girth 0.55) bir “ray”a dönüşür ve başlık ile kartlar arasındaki ölçülen **spine band**'e oturur (`projectsBand`). Her landing kartının üstünde dekoratif `data-spine-anchor` node vardır; SVG bezier connector spine üzerindeki en yakın projeksiyon noktasından karta iner, üzerinde hareketli sinyal ve anchor pulse vardır. Connector yalnız kart spine'ın altında ve başlık tamamen spine'ın üstündeyken görünür (`connectorStrength`), böylece başlık metnini ve kart gövdesini kesmez. Kartlar normal HTML link olarak kalır.
6. **Skills** — spread=1: uydular ağa açılır ve Skill Universe kutusunu çevreler. Skill Universe düğümleri spine eğimindeki bir eksenden kademeli olarak ağ konumlarına açılır (`skillEmergence`); Timeline'a geçerken ağ kısmen eksene geri çekilir. HTML skill listesi korunur.
7. **Timeline** — en sade form: neredeyse dikey (tilt 0.1), curvature 0.14, wire 0.14, küçük halkalar (girth 0.5); sinyaller yol boyunca akar. Timeline track/node CSS'i spine ile akraba bir ışıltı aldı. Timeline yalnız eğitim/deneyim gösterir.
8. **Blog/CV/GitHub (archive)** — opacity 0.26, düşük hareket, sağ kenar.
9. **Contact** — arka plan dekoru: sağ-alt-derin, büyük ama opacity 0.22, glow 0.18, wire 0.24. İçerik `z-index:2`, link listesi yarı opak plaka üzerinde. Copy: “Bir proje, iş fırsatı / iş birliği ya da teknik bir konu için…”.
10. **Footer** — yalnız isim + © yıl + ince mint çizgi; nav/social/CV/GitHub/admin/version kaldırıldı (public ve CV layout).
11. **Background** — grid (en yavaş) opacity 0.5; ambient ışık spine hedeflerini izler ve 0.1'e indirildi; spine orta hız + section-local hafif parallax; içerik normal hız.
12. **Mobile** — 12 node / 4 halka / 2 strand / 28 partikül, DPR 1, 30 fps cap, curvature ×0.7, wire ×0.55, connector yok; Hero'da metnin üstündeki sahne alanında, diğer bölümlerde sağ kenarda soluk.
13. **Reduced motion** — OS tercihi veya “Hareketi azalt”: blend yok, aktif section'ın statik formuna snap; idle döngü, sinyal, parallax, pointer ve drift kapalı; yalnız scroll/section değişiminde tek çizim.
14. **Fallback** — WebGL2 yoksa veya context kaybında SSR CSS spine silüeti (eksen, 4 halka, 5 node); section'a göre CSS ile yer değiştirir.
15. **Lifecycle** — tek canvas/scene tüm landing boyunca yaşar (mount → scroll state → morph → section transition → contact → cleanup); hidden/overlay/landing dışı pause, 3 sn input yoksa 30 fps idle cap, context-loss/restore, tüm geometry/material/renderer dispose.
16. **Eski küre kodu** — `narrative-scene.tsx`, kullanılmayan `hero-scene.tsx` / `hero-visual.tsx` / `landing-background.tsx`, `narrativePosition` / `sceneState` / `narrativeStates`, `sceneQuality`, `.hero-visual*` / `.narrative-static-core` / eski footer CSS silindi. Skill Universe ve `quality.ts` yardımcıları korundu.

## Doğrulama

- Unit **85/85** (12 yeni Data Spine testi; Phase 11 unit testi küre API'si yerine spine hedefine uyarlandı), security **6/6**.
- HTTP **80/80**: Phase 5/7/2/3/4/8/10/11/13 = 7+7+9+12+18+10+7+4+6. Phase 11 HTTP fallback assertion'ı `narrative-static-core` → `spine-fallback` olarak güncellendi.
- lint, TypeScript, Next.js 16.3.6 build başarılı; `npm audit --audit-level=low` **0 vulnerability**.
- Browser (izole fixture sunucusu, viewport emülasyonu): 1440×900, 1024×768, 375×812, 390×844, 720×450. Hero/About/Projects/Skills/Timeline/Blog/Contact/footer görsel olarak incelendi; yatay taşma yok; console error yok.
- Contact: 7/7 link sol/orta/sağ noktada `elementFromPoint` ile kendisini döndürdü (desktop, 375, 720×450). Background/canvas/SVG `pointer-events:none`; Contact içinde canvas/SVG/pseudo-element yok.
- Projects: görünür 2 kartta connector strength 0.894 ve `data-connected=true`; kart linkleri hit-test geçti.
- WebGL context loss → `data-webgl=fallback`, CSS spine görünür; restore → WebGL tekrar çiziyor.
- “Hareketi azalt”: 2 sn'de 1 render (statik), içerik opacity=1; geri açılınca döngü devam. Palette açıkken 0 render; Escape sonrası overlay bayrağı kalkıyor. Mobil menü açıldı, link hit-test geçti, Escape ile kapandı; Terminal açılıp kapandı.
- Ölçüm: desktop 1286 vertex / 6 draw call, mobile 420 vertex / 6 draw call; DPR cap 1.5 / 1.

## Problemler ve çözümler

- Projects'te viewport-sabit spine başlık metninin üzerine geliyordu → Projects state'i ölçülen spine band'e bağlandı, girth düşürüldü, band CSS ile genişletildi.
- Connector bir kartta başlığa 13px yaklaştığı için güvenlik kuralıyla gizlendi → eğim/perspektif telafisi ve daha geniş band.
- Kenardan bakıldığında halkalar çizgi gibi görünüyordu → pitch artırıldı.
- Skills ağı başlığın içinden geçiyordu → ağ Skill Universe kutusuna indirildi, web opaklığı düşürüldü.
- **Hata:** 30 fps cap'te yeniden başlayan döngünün ilk frame'i hiç çizilmiyordu (mobile her zaman, desktop idle restart'ta) → ilk frame daima çizilir.
- Store'un ilk snapshot'ı `mobile:false` olduğundan mobilde ilk anda desktop boyu görünüyordu → scene viewport genişliğini de hesaba katar.
- Unit: `-0`/`0` ve `a+(b-a)*1` kayan nokta farkı → epsilon ve uç noktası kesin lerp.
- Phase 7 HTTP `class="site-footer"` sözleşmesi → closing class iç elemana taşındı; eski test değiştirilmedi.
- **Temizlik hatası:** Test DB temizliğinde kullanılan `.phase10-*.db` glob'u, 1.1.0'dan kalan `.phase10-pre-migration.db` yedeğini de sildi; başka kopyası yoktu, geri getirilemedi. `local.db` (güncel veri) etkilenmedi.

## Pending

Fiziksel cihaz, gerçek browser zoom (%200 yerine 720×450 eşdeğeri), OS `prefers-reduced-motion` emülasyonu (yalnız manuel toggle test edildi), gerçek WebGL2'siz cihaz (context loss ile simüle edildi), FPS/GPU trace, Lighthouse ve NVDA ölçülmedi. Browser pane rAF'ı kısıtladığı için idle 30 fps cap'i sayısal olarak doğrulanamadı. Görsel “premium” kabulü özneldir.

---

# 1.2.0 — Scroll-driven Public Experience

Tarih: 2026-09-26. Yalnız public landing; migration/auth/admin/CV/CRUD/deployment/cloud/remote değişikliği yok.

## Konsept ve uygulama

[Utsubo](https://www.utsubo.com/) web okuyucusu ve tarayıcıyla incelendi. Alınan ilke scroll'un sahne zamanı olmasıdır; hayvan/model/asset/metin/ses/layout kopyalanmadı. Özgün mint teknik anlatı: **çekirdek → akış → yapı → ağ → yol → sakin okuma → bağlantı**. Başlatma kapısı, ses ve scroll-jacking yok.

1. Hero: büyük headline, ayrı isim, iki CTA; dekoratif kutu yerine viewport sahnesi ve metne ayrılmış alan.
2. Ambient: seyrek grid/ışık/sinyal, global progress, section odağı ve CSS transform'ları.
3. Primary: aynı vertex topolojisinde küre, açılan helis, modüler küp, düz ağ ve dikey yol; Contact çekirdeği toplar.
4. Choreography: `narrative.ts` transform/scale/rotation/intensity/line/particle config; local enter/active/exit; ters scroll deterministik.
5. Controller: passive scroll, tek planlanan rAF; ResizeObserver ile cache edilmiş section ölçüleri; mutable subscription, scroll için React state yok.
6. About: yalnız mevcut longBio; yeni biyografi/schema yok. Boş section chapter listesinde yok.
7. Projects: üretim anlatısı, rafine tipografi/kartlar; local progress preview transform'u. Anime reveal ile farklı DOM hedefleri; carousel yok.
8. Skills: primary yoğunluğu düşürülerek mevcut Skill Universe'e devir; gerçek HTML button listesi ve seçili skill korunur.
9. Timeline: yalnız education/experience; rafine satırlar, mevcut scroll çizgisi ve primary yol. Builder değişmedi.
10. Blog/CV/GitHub: düşük sahne yoğunluğu, okuma önceliği. Contact doğal son; sade footer değişmedi.
11. Header: palette/Terminal korunur; palette mobil erişilebilir ismi eklendi. Geniş viewport chapter index native anchor ve active location cue kullanır.
12. Mobile: 84 düğüm, DPR cap, küçük/soluk obje; Hero sahne üstte/metin altta. Kısa viewport hizalaması header'ı hesaba katar.
13. Reduced: OS matchMedia listener ve “Hareketi azalt” seçimi; morph/parallax/transition kapanır, HTML görünürdür. Skill canvas da statikleşir; seçili skill değişiminde tekrar çizilir.
14. Fallback: SSR CSS çekirdeği JS/WebGL öncesinde vardır; context loss'ta da görünür. Metinler canvas dışında.
15. Lifecycle: hidden/overlay/landing dışı pause; primary sürekli idle RAF kullanmaz; observer/listener/rAF/geometri/materyal/renderer cleanup. Yeni texture/model/font/dependency yok.
16. Güvenlik: mevcut public DTO/draft/private repo/phone/social/CV sınırları, terminal registry ve href allowlist değişmedi. Store yalnız görsel sayısal state taşır.

## Doğrulama

- Unit **75/75**, ayrı security **6/6**; 7 yeni narrative test.
- lint, TypeScript, Next.js 16.3.6 build başarılı; audit **0 vulnerability**.
- HTTP **74/74**: Phase 5/7/2/3/4/8/10/11 = 7+7+9+12+18+10+7+4. İzole local libSQL; auth limiter gevşetilmeden pencere beklenir.
- Browser CSS **1439×900, 375×812, 390×812, 719×451**: Hero/Projects/Skills/Timeline/Contact/footer; yatay taşma false. Son ölçü yaklaşık %200 viewport eşdeğeridir, gerçek browser zoom değildir.
- core→build→network→path→core durumları ve görseller doğrulandı. Menü/palette/Terminal açılıp kapandı; console error listesi boş.
- Manuel hareket azaltma runtime: `narrative-motion=reduced`, quality static, morph core, content opacity=1. OS media-query emülasyonu araçta yok, bu doğrulama pending.
- Ölçülen primary renderer: desktop **312**, mobile **84** vertex, **3 draw call**. Bunlar FPS/Lighthouse/gerçek cihaz ölçümü değildir; 60 FPS veya performans artışı iddiası yok.

## Problemler ve çözümler

İlk unit assertion network maksimumunu 2.1 varsaydı; gerçek form sınırı 2.25'e düzeltildi, tekrar 75/75 geçti. Düşük line density'nin şeklin son sıralarını kesmesi bağlantıların deterministik dağıtılmasıyla giderildi. Blend reset X-rotation sıçraması intensity interpolasyonuna bağlandı. Kısa mobile Hero header kesişmesi viewport+header hizalamasıyla düzeltildi. HMR/anchor restoration eski pozisyonu tutabildi; temiz yükleme ve native Ctrl+Home ile tekrar kontrol edildi.

## Pending

OS reduced-motion runtime, fiziksel cihaz, NVDA, FPS/GPU trace ve Lighthouse ölçülmedi. Görsel “wow” kabulü öznel; garanti edilmez. Cloud/deploy/remote ve okul şablonu işleri kapsam dışında.

---

## 1.1.0 — UX, İçerik ve CV İyileştirmeleri (tarihsel kayıt)

Tarih: 2026-09-26. Yalnız yerel çalışma; cloud/deploy/remote/commit yok.
Mevcut DB korunmuştur; `.phase10-pre-migration.db` geri alınabilir kopyası
saklandı (1.3.0 notu: bu yedek 1.3.0 test temizliğinde yanlışlıkla silindi). Migration öncesi/sonrası tüm mevcut tablo kayıt sayıları eşittir.

## Uygulama ve doğrulama

1. Schema: `profiles.phone`, `is_phone_visible`, `social_links.show_in_cv`.
2. Migration: üçüncü additive migration; eskiler değişmedi. Telefon gizli/boş; eski GitHub/LinkedIn/Website CV true, diğerleri false.
3. Profile: opsiyonel `type=tel`; ülke bağımsız 7–15 rakam, görünürlük checkbox.
4. Contact: yalnız mevcut/görünür telefon; güvenli normalize `tel:`.
5. CV phone: web/PDF aynı public DTO; boş separator yok.
6. Social: Instagram, Behance, Dribbble dahil 12 platform.
7. showInCv: website visibility'den bağımsız SQL AND filtresi. Ayrı career layout CV shell/palette/footer payload'ını da filtreler; CV'de env GitHub fallback kapalı.
8. Education: program opsiyonel; okul/başlangıç gerekli. Açıklama/bitiş yardımcı opsiyonel alanlar korunur.
9. Placeholder: boş/dash-only program ve açıklama render edilmez; eski DB değeri değiştirilmez.
10. shortBio: yalnız Hero; CV override → longBio → bölüm yok.
11. Kısa Profil kaldırıldı.
12. About yalnız longBio; boşsa bölüm yok.
13. Timeline deterministik tarih/ID sırasıyla yalnız eğitim-deneyim.
14. Projeler ayrı showcase; published/includeInCv CV projeleri korunur. Gerçek HTTP fixture'da published proje journey dışında; eğitim/deneyim içeride doğrulandı.
15. Footer bio/version/debug/admin linki/terminal içermez; admin linkini gizlemek güvenlik mekanizması değildir.
16. Header erişilebilir yardımcı Terminal; mobilde ikon, aria-label korunur.
17. Background fixed/pointer-events-none grid, mint radial light, sinyal katmanları.
18. Passive scroll → tek rAF → transform/opacity CSS variables; IntersectionObserver görünür section map'i. Hero→Contact grid offset yaklaşık -193px, ışık sağ-üstten alt-orta konuma geçer.
19. Three constellation ve Anime reveal korunur; debug etiketi sadeleştirildi.
20. Reduced-motion JS preference değişimi frame iptali/reset ve CSS statik fallback; araç runtime tercih emülasyonu sunmadı, pending.
21. Mobile gerçek CSS 375×812 ve 390×812: menü, Contact ve CV taşmasız. 719×451 kısa viewport ~200% desktop eşdeğeri; Terminal dialogu kullanılabilir.
22. CV tek kolon; varsayılan Profesyonel Özet/Deneyim/Eğitim/Projeler/Yetenekler. Kaydedilmiş admin bölüm sırası korunur; boş bölüm yok.
23. Helvetica Türkçe Unicode kapsamı yetersizdi. Yerel statik Noto Sans 400/700 TTF, OFL lisansı, PDF font tracing; runtime ağ isteği yok. React PDF resmi fonts dokümanı TTF desteğini doğruladı.
24. Gerçek endpoint PDF'i Poppler ile PNG render edilip incelendi. İlk isim/headline sıkışması margin/line-height ile giderildi; Türkçe/telefon/boş program doğru. Proje/yetenek/eğitim içeren ikinci fixture de incelendi. Bağımsız PDFium extraction tüm ĞğÜüŞşİıÖöÇç karakterleri için true; 1 sayfa. Az içerikte alt boşluk korunur; sahte içerik eklenmez.
25. Web CV telefon/Türkçe/opsiyonel program/Instagram dışlama doğrulandı.
26. Security auth/role/origin/CSP/terminal allowlist değişmedi. Anonim mutation, signup, private repo, draft proje/blog, zararlı URL ve DTO privacy regresyonları çalıştırılır.
27. Unit 68/68 başarılı (security 6 dahil); yeni 5 UX testi ve timeline project exclusion güncellemesi.
28. HTTP izole local libSQL runner: 70/70; Phase 5/7/2/3/4/8/10 sırasıyla 7/7, 7/7, 9/9, 12/12, 18/18, 10/10, 7/7. Sign-in rate limiter gevşetilmeden son grup öncesi pencere beklendi.
29. Browser gerçek CSS 1439×900 (~1440), 375/390 mobile, 719×451 kısa viewport; Hero bioCount=1, taşma yok, console error=[], section-aware değişim gözlendi. Fiziksel cihaz/FPS/Lighthouse ölçülmedi.
30. lint son başarılı; `.next-test` üretilmiş dosyaları ignore edilir.
31. TypeScript ve route typegen başarılı; CV route group taşıması doğrulandı.
32. Next 16.3.6 production build başarılı; production local DB reddi korunur. HTTP testleri next dev'de çalışır.
33. npm audit --audit-level=low: 0 vulnerability.
34. Bulunan sorunlar: CSS sırası/mobil menü, CV env fallback, legacy Unicode extractor, PDF header spacing, eski copy assertion, test build lint kapsamı.
35. Çözümler: final responsive override, CV-only shell, Type0/ToUnicode ve çoklu-codepoint ligature okuyucusu, spacing, copy/test güncellemesi, build ignore. Sandbox ENOMEM nedeniyle unit host ortamında doğrulandı.
36. README, FINAL_REPORT, PROJECT_REPORT, ARCHITECTURE, DECISIONS, SECURITY, CHANGELOG, TEST_LOG, USER_GUIDE, FINAL_STATUS güncellendi; eski phase sonuçları tarihsel kayıttır.
37. Sürüm 1.1.0; package/lock tutarlı.
38. Pending cloud/deploy/remote, fiziksel cihaz/Lighthouse/FPS, reduced-motion runtime emülasyonu, okul şablonu/kişisel kapak bilgileri.

## Tekrar çalıştırma

`npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`,
`npm audit --audit-level=low`; HTTP: `node tests/local-regression.mjs`.
Runner benzersiz gitignored DB ve 3100 portu kullanır, credential yazdırmaz.
`TEST_GROUPS` virgülle ayrılmış betik seçer; `TEST_KEEP_SERVER=1` görsel fixture
sunucusunu açık tutar. `.next-test` izole dev build; normal `.next`/3000 korunur.
Font kaynağı/lisans: `public/fonts/README.md`, `OFL.txt`.
