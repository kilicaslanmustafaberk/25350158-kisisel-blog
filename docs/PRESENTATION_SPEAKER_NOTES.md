# Sunum Konuşma Metni — 1.9.0

Bu metin ezberlenmek için değil, konuşmanın akışını hatırlatmak için yazıldı. Cümleleri kendi ağzına göre değiştir. Slayt yapısı [PRESENTATION_OUTLINE](PRESENTATION_OUTLINE.md) içindedir.

- **Normal sürüm:** 7–10 dakika (hedef ~8,5 dakika) + 3–4 dakika canlı demo
- **Kısa sürüm:** 5 dakika (acil durum; demo yok veya 1 dakikalık mini demo)

Genel ipuçları:

- Slayttaki maddeleri okuma; maddeler senin için başlık.
- Rakamları yalnız Slayt 13'te ver. Diğer slaytlarda "neden" anlat.
- Güvenlik bulgusunu (Slayt 12) saklama; projenin en güçlü anlatısı o.
- "Hacklenemez", "tamamen güvenli", "production'da çalışıyor" gibi ifadeler kullanma.

---

## NORMAL SÜRÜM (7–10 dakika)

### Slayt 1 — Kapak (~20 sn)

**Söyle:**
"Merhaba, ben Mustafa Berk Kılıçaslan. Bitirme projem, bir yazılım geliştiricinin projelerini, yazılarını, sertifikalarını ve CV'sini tek bir yönetim panelinden güncelleyebildiği dinamik bir kişisel vitrin. Arkada gördüğünüz, sitenin açılış sayfası."

**Zaman harcama:** Sürüm numarasına, teknoloji adlarına.

**Geçiş:** "Bu projeye neden ihtiyaç duyduğumla başlayayım."

### Slayt 2 — Problem (~35 sn)

**Söyle:**
"Klasik bir portfolyo sitesi genelde birkaç statik sayfadan oluşuyor. Yeni bir sertifika aldığımda bunu sitede, Word CV'mde ve PDF'te ayrı ayrı güncellemem gerekiyordu. Bir süre sonra bu üç kopya birbirini tutmamaya başlıyor. Daha ciddi bir risk de var: taslak bir yazı veya paylaşmak istemediğim bir telefon numarası yanlışlıkla yayına çıkabiliyor."

**Zaman harcama:** Hazır platformların (Wix, LinkedIn vb.) karşılaştırmasına.

**Geçiş:** "Bu yüzden hedefim şuydu."

### Slayt 3 — Amaç ve kapsam (~35 sn)

**Söyle:**
"Amacım, bilgiyi tek bir yerde tutmak ve site, web CV ve PDF CV'yi bu tek kaynaktan üretmekti. Sistem tek sahipli: içeriği sadece ben yönetiyorum, ziyaretçiler kayıt olmuyor. Yani bu bir SaaS değil. Bunu bilinçli seçtim; kayıt ekranı, parola sıfırlama, kullanıcı rolleri olmadığı için saldırı yüzeyi küçülüyor ve her admin işlemi tek bir soruya iniyor: oturum var mı ve rol admin mi?"

**Zaman harcama:** Kapsam dışı bırakılan her maddeyi saymaya.

**Geçiş:** "Bunu hangi teknolojilerle kurduğuma kısaca bakalım."

### Slayt 4 — Teknoloji yığını (~30 sn)

**Söyle:**
"Temelde Next.js, React ve TypeScript var. Next.js'i seçtim çünkü public siteyi ve admin panelini aynı projede, sunucu tarafında render ederek kurabiliyorum. Veritabanı Turso/libSQL; geliştirmede tek bir dosya olarak çalışıyor, bu da testi çok kolaylaştırdı. Drizzle ile tip güvenli sorgular yazıyorum. Kimlik doğrulama Better Auth, görseller Cloudflare R2'de."

**Zaman harcama:** Tiptap, Anime.js, Three.js, Zod'un ayrıntısına — ilgili slaytlarda geliyor.

**Geçiş:** "Bu parçalar şu şekilde birbirine bağlanıyor."

### Slayt 5 — Sistem mimarisi (~40 sn)

**Söyle:**
"Sistemde iki ayrı akış var. Üstte ziyaretçi akışı: ziyaretçiye veritabanı satırı değil, o sayfa için gereken en küçük veri nesnesi gidiyor. Yayımlanmamış veya gizli kayıt bu nesneye hiç girmiyor. Altta admin akışı: her istek önce oturum, sonra rol, sonra isteğin hangi siteden geldiği, en son da veri doğrulamasından geçiyor. Veritabanı ve R2 anahtarları sadece sunucuda duruyor; tarayıcıya hiçbir zaman gönderilmiyor."

**Zaman harcama:** Klasör yapısına.

**Geçiş:** "Admin tarafının nasıl göründüğüne bakalım."

### Slayt 6 — Admin paneli (~30 sn)

**Söyle:**
"Panelde projeler, blog, profil, eğitim, deneyim, sertifika, yetenek, sosyal bağlantılar ve CV ayarları var. Her kayıtta görünürlük ve sıra kontrol edilebiliyor. Değişiklik yaptığımda public sayfa hemen güncelleniyor. İlk admin hesabı sadece terminalden bir komutla oluşturuluyor; sistemde varsayılan kullanıcı ya da varsayılan parola yok."

**Zaman harcama:** Her formu tek tek tarif etmeye.

**Geçiş:** "Bu ekranlardan üçü projenin ana içeriğini taşıyor."

### Slayt 7 — Proje, blog, sertifika (~40 sn)

**Söyle:**
"Projelerde problem, çözüm, rol gibi vaka çalışması alanları var. Repository'yi private işaretlersem bağlantı public tarafa hiç gitmiyor, sadece bir etiket görünüyor. Blogda Tiptap editörü kullandım ama içeriği HTML olarak saklamıyorum, yapısal JSON olarak saklıyorum. Sunucu sadece bildiği yapıları kabul ediyor; böylece araya bir script ya da zararlı bir bağlantı giremiyor. Sertifikalarda iki ayrı seçenek var: sitede göster ve CV'de göster. Bu filtre SQL sorgusunda uygulanıyor."

**Zaman harcama:** Kategori/etiket, slug üretimi, galeri sıralaması.

**Geçiş:** "Sertifikalardan bahsetmişken, CV tarafına geçeyim."

### Slayt 8 — CV, PDF, ATS (~40 sn)

**Söyle:**
"CV verim yapılandırılmış olarak tutuluyor; Web CV bu veriden dinamik oluşuyor ve gizli bir alan, örneğin gizli e-posta, sunucuda hiç üretilmiyor, çünkü CSS ile gizlemek gizlilik değil. Sistem aynı veriden tek kolonlu, ATS odaklı bir PDF de üretebiliyor. Ama kendi hazırladığım profesyonel CV daha iyi görünüyordu. Bu yüzden 1.9.0'da admin panelinden profesyonel bir PDF yükleyebiliyorum ve ziyaretçi 'CV'ye tıkladığında o açılıyor. Yükleme yoksa ya da depolamaya ulaşılamazsa sistem otomatik olarak üretilen PDF'e düşüyor; bağlantı hiç değişmiyor. Yükleme de güvenli: yalnız PDF, en fazla 5 MB, ve dosyanın gerçekten PDF olduğunu sunucu ilk baytlarından kontrol ediyor."

**Zaman harcama:** ATS puan formülüne ve yükleme bileti ayrıntısına — soru gelirse anlat.

**Geçiş:** "İçerik tarafı bu kadar. Şimdi sitenin görsel kimliğine geçeyim."

### Slayt 9 — Data Spine (~40 sn)

**Söyle:**
"Açılış sayfasında 'Data Spine' dediğim, sayfa boyunca uzanan tek bir veri omurgası var. Projeler, eğitim, sertifikalar gibi her bölüm bu omurganın bir durağı. Scroll ettikçe omurgadaki nokta durağa geliyor, sahne sabitleniyor ve kartlar sırayla açılıyor. Burada dikkat ettiğim şey şu: animasyon tamamen dekoratif. İçerik gerçek HTML; ekran okuyucu ve arama motoru animasyondan bağımsız okuyabiliyor. Hareketi azaltma tercihi açıksa sabitleme kapanıyor ve her şey baştan görünüyor."

**Zaman harcama:** Spline matematiğine, shader ayrıntısına, sürümler arası tasarım evrimine.

**Geçiş:** "Projelerdeki görseller de R2 üzerinden geliyor; onun güvenliği ayrı bir konu."

### Slayt 10 — R2 medya sistemi (~45 sn)

**Söyle:**
"Görsel dosyası sunucumdan geçmiyor; tarayıcı doğrudan R2'ye yüklüyor. Ama sunucu her adımı denetliyor. Önce admin izin istiyor, sunucu 5 dakika geçerli imzalı bir adres veriyor. Yükleme bitince sunucu dosyanın gerçek türüne ve boyutuna bakıyor, sonra ilk baytlarını okuyup gerçekten JPEG, PNG ya da WebP olup olmadığını kontrol ediyor. Uymazsa dosyayı siliyor. SVG ve GIF kabul edilmiyor, sınır 5 megabayt. Bunu gerçek bir bucket ile test ettim.
Test sırasında ilginç bir sorun çıktı: Türk Telekom bağlantısında r2.dev adresine giden TLS bağlantısına ağdaki bir cihaz müdahale ediyordu. Uygulamayı, CORS'u ve CSP'yi tek tek eledim. Çözümü sadece geliştirme ortamında çalışan bir uç nokta ile yaptım; production davranışına dokunmadım."

**Zaman harcama:** HMAC bileti alanlarına, TLS paketi ayrıntısına.

**Geçiş:** "Bu yükleme akışı, genel güvenlik yaklaşımımın bir parçası."

### Slayt 11 — Güvenlik mimarisi (~40 sn)

**Söyle:**
"Güvenliği katman katman düşündüm. Kayıt kapalı ve rol yükseltme engelli. Girişte dakikada 5 deneme sınırı var. CSRF'e karşı hem cookie ayarı hem de isteğin geldiği siteyi kontrol ediyorum. SQL injection için tüm sorgular parametreli, XSS için hem içerik allowlist'i hem de CSP var. Admin ve PDF yanıtları önbelleğe alınmıyor. Production bağımlılık denetimi temiz. Şunu da açıkça söyleyeyim: bunlar riski azaltır, sistem hacklenemez demiyorum; biçimsel bir penetrasyon testi yapılmadı."

**Zaman harcama:** Her başlığı tek tek açıklamaya; CSP direktiflerine.

**Geçiş:** "Bu katmanlara rağmen, kendi denetimimde kritik bir açık buldum."

### Slayt 12 — Kritik güvenlik bulgusu (~1 dk)

**Söyle:**
"Başta admin yetkilendirmesini sadece admin bölümünün ortak layout'una koymuştum. Mantığım şuydu: bütün admin sayfaları bu layout'un içinde, o halde hepsi korunuyor.
Projeyi public yapmadan önce yaptığım denetimde şunu gördüm: oturumsuz bir istek giriş sayfasına doğru şekilde yönlendiriliyordu, durum kodu 307'ydi. Ama yanıtın gövdesine baktığımda sayfanın çektiği taslak yazılar ve gizli bilgiler oradaydı. Çünkü Next.js'te layout ve sayfa paralel render edilebiliyor; layout'taki yönlendirme sayfanın veri çekmesini durdurmuyor. Test veritabanında 15 sayfanın 12'sinde bu sızıntıyı tekrar ürettim.
Çözüm basitti ama önemliydi: her sayfa, veri çekmeden önce kendi içinde admin kontrolü yapıyor. Sonra yanıtın gövdesini kontrol eden bir test ekledim ve açığı geri koyduğumda testin gerçekten başarısız olduğunu doğruladım. Proje hiç yayımlanmadığı için gerçek bir sızıntı olmadı.
Bu bana iki şey öğretti: güvenlik tek bir noktaya bırakılmamalı, ve sadece yönlendirmeyi test etmek yetmiyor, yanıtın içine bakmak gerekiyor."

**Zaman harcama:** RSC Flight protokolünün iç yapısına.

**Geçiş:** "Bu tür hataları yakalayabilmek için test altyapısı kritik oldu."

### Slayt 13 — Test sonuçları (~30 sn)

**Söyle:**
"Final sürümde 131 birim testi, 11 güvenlik birim testi, 8 güvenlik HTTP testi, 140 HTTP regresyon kontrolü ve yüklenen CV için 16 ayrı HTTP kontrolü geçiyor. Lint, tip denetimi ve production build temiz. HTTP testleri her seferinde ayrı bir geçici veritabanı oluşturuyor, gerçek verime hiç dokunmuyor. Production bağımlılık denetimi sıfır bulgu veriyor. Tam denetimde sadece lint araçlarında bir uyarı var; onu düzeltmek için önerilen yol lint paketini eski bir sürüme düşürmek olduğu için bilerek uygulamadım."

**Zaman harcama:** Tüm faz bazlı test listesine.

**Geçiş:** "Son olarak nerede olduğumu ve eksikleri özetleyeyim."

### Slayt 14 — Sonuç (~30 sn)

**Söyle:**
"Sistem yerelde tamamlandı ve testlerle doğrulandı. R2 gerçek ortamda çalışıyor. Henüz yapılmayanları açıkça söylemek istiyorum: production deploy, özel alan adı ve canlı HTTPS üzerinde cookie testi bekliyor. Sonraki adımlarım bunlar, ardından 2FA ve gerçek cihaz/ekran okuyucu testleri. Şimdi kısa bir canlı demo göstermek istiyorum."

**Zaman harcama:** Gelecek geliştirmeler listesinin tamamına.

**Geçiş:** Demoya geç → [DEMO_SCRIPT](DEMO_SCRIPT.md).

---

## KISA SÜRÜM (5 dakika — acil durum)

Süre kısaltılırsa slaytları atlamak yerine birleştir. Sıra: 1 → 2+3 → 5 → 7+8 → 9 → 10 → 12 → 13+14. Slayt 4, 6 ve 11'i hızlıca geç.

| Blok | Slaytlar | Süre | Söylenecek tek fikir |
| --- | --- | ---: | --- |
| Açılış | 1 | 0:15 | "Tek panelden yönetilen dinamik kişisel vitrin." |
| Problem + amaç | 2, 3 | 0:40 | "Bilgi üç yerde tekrar ediyordu; tek kaynak ve tek admin ile çözdüm. SaaS değil." |
| Mimari | 5 (4'ü göster, anlatma) | 0:35 | "Public tarafa sadece küçük, filtrelenmiş veri gider; admin isteği dört kontrolden geçer." |
| İçerik + CV | 7, 8 | 0:50 | "Blog JSON olarak saklanıyor; Web CV yapılandırılmış veriden, ziyaretçiye yüklediğim profesyonel PDF açılıyor, üretilen PDF yedek. Gizlilik sunucuda." |
| Data Spine | 9 | 0:30 | "Dekoratif omurga; içerik HTML, reduced-motion destekli." |
| R2 | 10 | 0:35 | "Dosya doğrudan R2'ye, ama tür, boyut ve ilk baytlar sunucuda doğrulanıyor; gerçek bucket ile test edildi." |
| Güvenlik bulgusu | 12 | 0:50 | "Layout'taki kontrol yetmedi, 307 yanıtın gövdesinde veri vardı; her sayfaya kontrol + gövde testi." |
| Test + sonuç | 13, 14 | 0:45 | "131 unit, 140 HTTP, build temiz; deploy henüz yapılmadı." |
| **Toplam** | | **~5:00** | |

Kısa sürümde canlı demo yapılmaz. Jüri isterse en fazla 1 dakika: açılış sayfası scroll → navbar "CV" → profesyonel PDF yeni sekmede açılır.

---

## Konuşurken kaçınılacak ifadeler

| Kullanma | Bunun yerine |
| --- | --- |
| "Sistem hacklenemez / %100 güvenli" | "Bu önlemler riski azaltıyor; biçimsel penetrasyon testi yapılmadı." |
| "Site yayında / production'da çalışıyor" | "Yerelde tamamlandı; production deploy bekliyor." |
| "ATS puanı yüksek, işe alınırım" | "Kurallara dayalı, açıklanabilir bir uyumluluk kontrolü." |
| "Her cihazda 60 FPS" | "Kalite kademeleri ve kare sınırı var; fiziksel cihaz ölçümü yapılmadı." |
| "Hiç açık yok" | "Bulduğum kritik açığı düzelttim ve testle koruma altına aldım." |
