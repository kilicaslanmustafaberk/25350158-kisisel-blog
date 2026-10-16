# Olası Jüri Soruları ve Model Cevaplar — 1.9.0

Cevaplar kısa tutuldu. Ezberlemek yerine ana fikri kendi cümlelerinle söyle. Bilmediğin bir şey sorulursa tahmin etme; "Bunu test etmedim / ölçmedim" demek daha güven verici.

## Mimari ve teknoloji seçimleri

**1. Neden Next.js?**
Public siteyi ve admin panelini aynı projede kurabildim. Server Components ile veriyi sunucuda çekip ziyaretçiye yalnız gerekli kısmı gönderebiliyorum. API uç noktaları (Route Handler) da aynı projede. Sunucu tarafı render SEO ve ilk yükleme için de avantajlı.

**2. Neden Turso / libSQL?**
SQLite uyumlu. Geliştirmede tek bir dosya olarak çalışıyor; kurulum gerektirmiyor. Her test için ayrı bir geçici veritabanı dosyası oluşturabildim, böylece gerçek verime hiç dokunmadan test yaptım. Production'da aynı şemayla yönetilen bulut veritabanına geçilebiliyor.

**3. Neden Drizzle ORM?**
Tip güvenli sorgular yazıyorum; tablo veya alan adı yanlışsa derleme sırasında hata alıyorum. Sorgular parametreli üretildiği için SQL injection'a karşı koruma sağlıyor. Sürümlenmiş migration desteği var.

**4. Neden Better Auth?**
Uygulamanın içinde çalışıyor, dış bir servise bağımlı değil. Public kaydı tek ayarla kapatabildim. Drizzle ile uyumlu, admin rolü ve veritabanı tabanlı hız sınırlama destekliyor.

**5. Neden Supabase kullanmadınız?**
Supabase güçlü bir platform ama PostgreSQL, auth ve storage'ı birlikte getiriyor. Tek adminli kişisel bir proje için bu ek servisler gereksiz operasyon yükü. Ayrıca yerelde tek dosyayla çalışabilmek test sürecini çok basitleştirdi. Daha büyük, çok kullanıcılı bir sistemde Supabase/PostgreSQL mantıklı bir seçim olurdu.

**6. Neden Cloudflare R2?**
S3 uyumlu API'si var, yani yaygın AWS SDK ile presigned URL üretebiliyorum. Dışarı veri çıkış (egress) ücreti yok. Görselleri veritabanında veya kod deposunda tutmak yerine ayrı bir depolama katmanında tutmak daha doğru.

**7. RSC (React Server Components) nedir?**
Sunucuda çalışan React bileşenleri. Veritabanına doğrudan erişebilirler ve tarayıcıya JavaScript olarak değil, render sonucu olarak (RSC payload / Flight verisi) gönderilirler. Avantajı, istemci paketinin küçülmesi ve verinin sunucuda kalması. Dikkat edilmesi gereken: bileşenin kullandığı veri bu payload'a girer; yani sunucu bileşeni gizli veri okursa, o veri yanıtta görünebilir.

**8. Neden tek admin? Çok kullanıcılı olsaydı ne değişirdi?**
Kişisel vitrinin tek sahibi var; kayıt, parola sıfırlama ve rol yönetimi saldırı yüzeyini büyütürdü. Çok kullanıcılı olsaydı her tabloya sahip (owner) alanı, her sorguya sahiplik koşulu (IDOR/BOLA koruması), kayıt ve e-posta doğrulama, parola sıfırlama ve büyük ihtimalle 2FA eklemek gerekirdi.

## Güvenlik

**9. Bulduğunuz güvenlik açığı neydi?**
Admin sayfalarında yetkilendirme sadece ortak layout'taydı. Oturumsuz istek giriş sayfasına 307 ile yönlendiriliyordu ama yanıtın gövdesinde ve RSC verisinde sayfanın çektiği taslak yazılar ve gizli bilgiler vardı. Test veritabanında 15 admin sayfasının 12'sinde bunu yeniden ürettim. Proje hiç yayımlanmadığı için gerçek bir sızıntı olmadı.

**10. Layout'taki kontrol neden yetmedi?**
Next.js App Router'da layout ve sayfa ayrı sunucu bileşenleri ve paralel render edilebiliyor. Layout'taki yönlendirme, sayfa bileşeninin çalışıp veri çekmesini garanti olarak durdurmuyor. Bu yüzden her sayfa, veri çekmeden önce kendi `await requireAdmin()` kontrolünü yapıyor. Next.js'in kendi dokümantasyonu da layout'taki kontrole güvenilmemesini öneriyor.

**11. Bunun tekrar olmayacağını nasıl biliyorsunuz?**
Yanıtın gövdesini kontrol eden bir HTTP testi ekledim: benzersiz başlıklı bir taslak oluşturup oturumsuz HTML ve RSC yanıtlarında bu başlığın olmadığını doğruluyor. Kontrolleri geçici olarak kaldırdığımda testin başarısız olduğunu gördüm. Yeni bir admin sayfası eklenirse aynı kalıp izlenmeli; bu kural güvenlik dokümanında yazılı.

**12. CSRF nedir, nasıl korundunuz?**
Kullanıcının oturumu açıkken başka bir sitenin onun adına istek göndermesi. Üç katman var: oturum çerezi `SameSite=Lax` olduğu için başka sitelerden gelen POST isteklerine eklenmiyor; admin API'leri `Origin` başlığının birebir benim adresim olmasını istiyor; `Origin` yoksa tarayıcının `Sec-Fetch-Site` başlığıyla cross-site istekler reddediliyor.

**13. SQL injection'a karşı ne yaptınız?**
Tüm sorgular Drizzle ile parametreli üretiliyor; kullanıcı girdisi SQL metnine eklenmiyor. Ayrıca girdiler Zod ile tür, uzunluk ve biçim açısından doğrulanıyor.

**14. XSS'e karşı ne yaptınız?**
Blog içeriğini HTML olarak değil, Tiptap JSON olarak saklıyorum ve sadece izin verilen yapıları kabul ediyorum. Bağlantılarda yalnız `http`, `https` ve `mailto` geçiyor. Render sırasında `dangerouslySetInnerHTML` kullanmıyorum; React metni otomatik kaçışlıyor. SVG yüklemesini reddediyorum. Üstüne CSP var.

**15. Neden magic-byte kontrolü?**
Dosya uzantısı ve tarayıcının gönderdiği MIME türü kolayca değiştirilebilir. Bir HTML dosyası `resim.jpg` adıyla gönderilebilir. Magic byte dosyanın ilk baytları: JPEG `FF D8 FF`, PNG `89 50 4E 47` ile başlar. Sunucu bu baytları R2'deki gerçek nesneden okuyup bildirilen türle karşılaştırıyor; uymazsa nesneyi siliyor.

**16. Presigned URL nedir?**
Sunucunun kendi anahtarıyla imzaladığı, belirli bir işlem (burada tek bir dosyaya PUT) için kısa süre geçerli bir adres. Tarayıcı bu adresle dosyayı doğrudan R2'ye yüklüyor; R2 anahtarlarım tarayıcıya hiç gitmiyor. Benim adreslerim 5 dakika geçerli ve sunucunun ürettiği tek bir nesne anahtarına bağlı.

**17. Presigned URL varsa neden ayrıca finalize adımı var?**
Presigned URL yüklenen içeriği doğrulamaz. Finalize adımında imzalı bilet kontrol ediliyor, nesnenin gerçek türü ve boyutu `HEAD` ile, içeriği ilk 16 bayt ile doğrulanıyor. Ancak hepsi uyarsa veritabanına kayıt yazılıyor.

**18. Mass assignment nedir?**
İstemcinin beklenmeyen alanlar, örneğin `role: "admin"` veya `published: true`, göndererek bunları veritabanına yazdırması. Ben istek gövdesini doğrudan veritabanına vermiyorum; Zod sadece izinli alanları seçiyor, repository bunları tek tek eşliyor. Rol alanı gönderildiğinde Better Auth `FIELD_NOT_ALLOWED` döndürüyor.

**19. Gizli bilgiyi neden CSS ile gizlemediniz?**
CSS ile gizlenen bilgi HTML kaynağında ve RSC verisinde yine duruyor. Sayfa kaynağını açan veya bir bot bunu görür. Gizlilik ancak bilgi sunucudan hiç gönderilmediğinde sağlanır. Bu yüzden filtreyi SQL sorgusunda ve veri nesnesi oluştururken uyguluyorum.

**20. `npm audit` neden tamamen temiz değil?**
Production bağımlılıkları (`npm audit --omit=dev`) sıfır bulgu veriyor. Tam denetimdeki uyarı sadece lint araçlarının zincirindeki `braces` paketinde; bu kod production'a girmiyor. Önerilen otomatik düzeltme lint yapılandırmasını Next.js 14 dönemine düşürüyordu, bu da projeyi bozardı. Uyumlu bir upstream sürüm çıktığında güncelleyeceğim.

**21. Sisteminiz güvenli mi?**
Bilinen risklere karşı katmanlı önlemler aldım ve bunları testlerle doğruladım. Ama "hacklenemez" demiyorum; biçimsel bir penetrasyon testi yapılmadı ve production ortamı henüz doğrulanmadı. Kendi denetimimde kritik bir açık bulmam da bu yüzden önemliydi.

## CV ve içerik

**22. Neden hem Web CV hem PDF?**
Web CV her zaman güncel, bağlantıları tıklanabilir ve her cihazda okunabilir. PDF ise başvurularda dosya olarak yükleniyor. İkisi aynı veriden üretildiği için hiçbir zaman çelişmiyor; bilgiyi bir kez güncelliyorum.

**23. ATS nedir? ATS puanınız neyi gösteriyor?**
ATS, şirketlerin başvuruları tarayıp filtrelediği yazılımlar. Çok kolonlu veya metni resim olarak içeren CV'leri hatalı okuyabiliyorlar. Bu yüzden PDF'im tek kolonlu ve metin tabanlı. Projedeki puan, gerçek bir şirketin ATS'ini taklit etmiyor; ad, unvan, özet uzunluğu, tarih tutarlılığı gibi açıklanabilir kuralları ağırlıklı olarak değerlendiriyor ve neyin eksik olduğunu söylüyor.

**23a. Sistem PDF üretebiliyorken neden ayrıca PDF yüklüyorsunuz?**
Üretilen PDF teknik olarak doğru, tek kolonlu ve ATS dostu, ama tasarım olarak kendi hazırladığım profesyonel CV kadar iyi görünmüyordu. 1.9.0'da admin panelinden profesyonel PDF yükleyebiliyorum ve ziyaretçinin "CV" bağlantısı onu açıyor. Üreticiyi silmedim: yükleme yoksa ya da depolamaya ulaşılamazsa sistem otomatik olarak üretilen PDF'e düşüyor. Web CV de yapılandırılmış veriden oluşmaya devam ediyor. Bağlantı hep aynı: `/api/cv/pdf`.

**23b. Yüklenen PDF'in gerçekten PDF olduğunu nasıl biliyorsunuz?**
Tarayıcının söylediği türe ve dosya adına güvenmiyorum. Dosya R2'ye yüklendikten sonra sunucu nesnenin gerçek türüne ve boyutuna bakıyor (en fazla 5 MB), sonra ilk baytlarını okuyup `%PDF-` ile başladığını kontrol ediyor. Adı `.pdf` yapılmış bir HTML, SVG veya resim reddediliyor ve depolamadan siliniyor. Yeni dosya doğrulanmadan eski CV değişmiyor. Bunlar otomatik testlerle kontrol ediliyor.

**23c. Ziyaretçi PDF'i doğrudan R2'den mi indiriyor?**
Hayır. Sunucu PDF'i R2'den kendisi okuyup aynı adres üzerinden veriyor. Böylece depolama adresi veya imzalı bağlantı dışarı çıkmıyor, dosya adı sabit kalıyor ve geliştirmede yaşadığım `r2.dev` ağ sorunundan da etkilenmiyor.

**24. Sertifikalar CV ile nasıl bağlantılı?**
Her sertifikanın "sitede göster" ve "CV'de göster" bayrakları var. CV'de çıkması için ikisinin de açık olması gerekiyor. Filtre SQL'de uygulanıyor; aynı sıra web'de, web CV'de ve PDF'te kullanılıyor. Doğrulama bağlantısı sadece HTTPS olabiliyor.

## Görsel deneyim ve performans

**25. Neden Anime.js ve Three.js? Gerekli miydi?**
İçerik için gerekli değil; o yüzden ikisini de dekoratif katman olarak kullandım. Portfolyo aynı zamanda bir tanıtım aracı ve akılda kalıcı bir görsel kimlik istedim. Three.js omurganın 3B katmanını ve Skill Universe'ü, Anime.js DOM geçişlerini yapıyor. İkisi de kaldırılsa site çalışmaya devam eder.

**26. Performans maliyeti nedir?**
Three.js sadece açılış sayfasında ve gecikmeli yükleniyor, diğer sayfaların paketine girmiyor. Piksel oranı masaüstünde 1,5, mobilde 1 ile sınırlı. Kare hızı scroll sırasında 60, boştayken ve mobilde 30 ile sınırlı. Sekme gizliyken veya dialog açıkken çizim duruyor, kaynaklar bileşen kaldırılırken serbest bırakılıyor. Fiziksel cihazda FPS ve production Lighthouse ölçümü yapmadım; bunu açıkça belirtiyorum.

**27. Reduced motion nasıl çalışıyor?**
İşletim sistemindeki `prefers-reduced-motion` tercihini okuyorum; ayrıca sayfada bir "hareketi azalt" anahtarı var. Etkinken kalite kademesi "static" oluyor: sahneler sabitlenmiyor, fazladan scroll eklenmiyor, bütün kartlar baştan görünüyor ve omurga en yakın durakta duruyor. İçerik aynı kalıyor.

**28. Animasyonlar erişilebilirliği bozmuyor mu?**
Canvas ve SVG katmanları `aria-hidden` ve tıklamayı engellemeyecek şekilde ayarlı. Tüm başlık, kart ve bağlantılar gerçek HTML. WebGL2 yoksa 3B katman hiç oluşturulmuyor. Gerçek bir ekran okuyucuyla test yapmadım; bu bekleyen bir madde.

## Süreç, sınırlar ve gelecek

**29. Türk Telekom / r2.dev sorunu neydi?**
Geliştirmede R2'deki görseller tarayıcıda açılmadı. Uygulamayı, bucket'ı, CORS'u ve CSP'yi tek tek eledim. Sonunda bu ağda `r2.dev` adresine giden TLS bağlantısına bir ara cihazın müdahale ettiğini ve TLS yerine bir HTTP yönlendirmesi döndüğünü kanıtladım. Sadece development'ta çalışan, sunucunun R2'den S3 API ile okuyup aynı adresten sunduğu bir uç nokta ekledim. Production'da bu uç nokta 404 döner; production davranışı değişmedi.

**30. Production'a geçerken ne değişir?**
Vercel'e deploy, Turso bulut veritabanına migration, R2 için `r2.dev` yerine özel bir medya alt alan adı ve CORS'un production adresine göre ayarlanması. Ardından canlı HTTPS üzerinde `Secure` cookie, CSP/HSTS ve Lighthouse kontrolü. Development medya uç noktası zaten production'da kapalı. Production'da yerel dosya veritabanı ve HTTPS olmayan auth adresi zaten reddediliyor.

**31. Bir sonraki adımda neyi geliştirirdiniz?**
Önce production deploy ve canlı doğrulamalar. Sonra admin için 2FA, gerçek ekran okuyucu ve cihaz testleri, sitemap/robots/JSON-LD, görsel optimizasyon ve kullanılmayan R2 nesnelerinin otomatik temizliği.

**32. Testleriniz gerçek verinizi bozabilir mi?**
Hayır. Tam HTTP regresyonu her çalıştırmada ayrı bir geçici veritabanı oluşturuyor, migration uyguluyor, geçici bir test admini açıyor ve ayrı bir portta izole sunucu başlatıyor. Gerçek `local.db` hiçbir zaman hedef değil. Önemli adımlardan önce yedek aldım ve bütünlük kontrolü yaptım.

**33. Projede en çok zorlandığınız şey neydi?**
Teknik olarak Data Spine'ın sticky scroll ile birlikte doğru ölçülmesi ve geri scroll'da tutarlı kalması. Öğretici olarak ise RSC sızıntısı: her şey doğru görünürken yanıtın içinde veri olması, testlerin neyi kontrol ettiğini sorgulamamı sağladı.
