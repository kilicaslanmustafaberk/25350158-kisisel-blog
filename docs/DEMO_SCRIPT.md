# Canlı Demo Akışı — 1.9.0

Hedef süre: **3–4 dakika**. Amaç bütün ekranları dolaşmak değil; tek veri kaynağını, admin → public akışını ve gerçek R2 yüklemesini göstermektir. Demo, sunumun Slayt 14'ünden sonra yapılır.

## Demo öncesi hazırlık (sunumdan önce)

- [ ] `npm run dev` çalışıyor; `http://localhost:3000` açılıyor.
- [ ] Gerçek, yayımlanmaya uygun içerik girilmiş: en az bir yayımlanmış proje (kapaklı), bir yayımlanmış blog yazısı, görünür sertifikalar. `deneme` gibi yer tutucu kayıt yok.
- [ ] 1.9.0 migration'ı gerçek veritabanına uygulanmış (`npm run db:migrate`) ve **profesyonel CV PDF önceden yüklenmiş**; admin CV sayfasında Durum "Yüklendi". Demoda canlı CV yüklemesi yapılmaz.
- [ ] Tarayıcıda iki sekme hazır: (1) public açılış sayfası, (2) `/admin/login`.
- [ ] Admin parolası tarayıcıya kaydedilmemiş ve ekranda otomatik doldurma önerisi çıkmıyor. Giriş, ekran paylaşımı başlamadan önce yapılabilir.
- [ ] Yüklenecek test görseli masaüstünde hazır: küçük (<1 MB) bir `.webp` veya `.jpg`. İsteğe bağlı: reddedilme örneği için bir `.svg`.
- [ ] Tarayıcı zoom %100; bildirimler kapalı; yer imleri çubuğu gizli.
- [ ] DevTools kapalı (gerekirse Network sekmesi önceden ayarlı, ama presigned URL'nin imza parametreleri büyütülmeyecek).
- [ ] `.env.local`, terminal geçmişi ve R2 dashboard ekranda açık değil.
- [ ] İnternet bağlantısı kontrol edildi; R2 yüklemesi demo günü bir kez prova edildi.
- [ ] Yedek ekran görüntüleri (SCREENSHOT_PLAN SS-01…SS-13) slayt dosyasının sonunda gizli slayt olarak hazır.

## Akış

| Süre | Adım | Göster | Söyle (kısa) |
| ---: | --- | --- | --- |
| 0:00–0:30 | 1. Açılış / Data Spine | Hero'dan Projects'e yavaş scroll; core durağa geliyor, kartlar sırayla açılıyor; sağ gösterge | "Tek omurga, bölümler durak. Animasyon dekoratif, içerik HTML." |
| 0:30–0:50 | 2. Proje | Bir proje kartına tıkla; vaka çalışması ve R2'den gelen kapak | "Problem, çözüm, rol; private repo ise bağlantı hiç gelmiyor." |
| 0:50–1:05 | 3. Blog | `/blog` → bir yazı | "İçerik JSON olarak saklanıyor, HTML olarak değil." |
| 1:05–1:20 | 4. Sertifikalar | Açılışta Sertifikalar bölümüne dön (ya da palette `Ctrl+K` → "sertifika") | "Sitede göster ve CV'de göster ayrı bayraklar." |
| 1:20–1:40 | 5. CV | Navbar'da "CV" → profesyonel PDF yeni sekmede açılır | "Ziyaretçinin gördüğü CV, admin panelinden yüklediğim profesyonel PDF. Bağlantı sabit: `/api/cv/pdf`." |
| 1:40–1:55 | 6. Web CV ve yedek | `/cv` sayfası; admin CV sayfasında "Profesyonel CV PDF" bölümü (dosya adı, boyut, tarih, Aç/İndir/Değiştir) | "Web CV yapılandırılmış veriden; yükleme olmasa sistem ATS odaklı PDF'i kendisi üretir." |
| 1:55–2:10 | 7. Admin giriş | İkinci sekme; giriş yapılmış Dashboard (ya da hızlı giriş) | "Kayıt yok; tek admin, CLI ile oluşturuldu." |
| 2:10–2:35 | 8. Proje düzenleme | Projects → aynı proje → kısa açıklamada küçük, geri alınabilir değişiklik → kaydet | "Değişiklik doğrudan veritabanına; izinli alanlar dışında hiçbir şey yazılmıyor." |
| 2:35–3:10 | 9. Gerçek R2 yükleme | Medya alanından `.webp` yükle; alt metin gir; önizleme görünür | "Dosya doğrudan R2'ye gidiyor; sunucu türünü, boyutunu ve ilk baytlarını doğruluyor." İsteğe bağlı: `.svg` seç → red mesajı |
| 3:10–3:35 | 10. Public sonuç | Public sekmede proje sayfasını yenile; yeni metin ve görsel görünür | "Admin'deki değişiklik public sayfada. Tek kaynak, anında yansıma." |
| 3:35–3:50 | Kapanış | Değişikliği geri al (veya demodan sonra geri alacağını söyle) | "Teşekkürler, sorularınızı alabilirim." |

**Toplam:** ~3:50. Süre daralırsa adım 3 ve 4 atlanır (~3:15).

## Yedek plan

| Sorun | Yapılacak |
| --- | --- |
| İnternet yok / R2'ye erişilemiyor | Adım 9'u atla. "Bu ağda R2'ye erişemiyorum" de, SS-09 ekran görüntüsünü göster ve akışı Slayt 10 diyagramı üzerinden anlat. Diğer adımlar yerel veritabanıyla çalışır. |
| Development ağında `r2.dev` görselleri açılmıyor | Development uç noktası (`/api/media/r2`) zaten bu durum için var; sunucu R2'ye S3 API üzerinden erişir. Sunucu da R2'ye ulaşamıyorsa yukarıdaki satırı uygula. |
| GitHub bölümü boş | API'ye ulaşılamazsa yalnız profil bağlantısı görünür; bu beklenen davranış. Üzerinde durma. |
| Yükleme 400 dönerse | Dosya türü/boyutu kontrol edilir; hazır `.webp` ile tekrar dene. Tekrar olmazsa ekran görüntüsüne geç. |
| Admin girişi rate limit'e takılırsa (429) | Bir dakika bekleme yerine önceden açık tutulan admin sekmesine geç. Bu yüzden giriş sunumdan önce yapılmalı. |
| Dev sunucu çöktü / sayfa açılmıyor | Demoyu bırak; SS-01, SS-04, SS-11, SS-11b, SS-06, SS-09 ekran görüntüleriyle aynı sırayı 2 dakikada anlat. |
| Animasyon takılıyor | Hareketi azalt anahtarını aç; "reduced-motion modunda sabitleme kapanıyor, içerik aynı" diyerek bunu bir özellik olarak göster. |
| Süre bitti | Adım 1, 5 ve 10'u göster (açılış → CV PDF → admin değişikliğinin public yansıması). |
| CV bağlantısı üretilen PDF'i açıyor | Profesyonel PDF yüklenmemiş veya R2'ye ulaşılamıyor; bu tasarlanmış yedek davranıştır. "Depolamaya ulaşılamadığında sistem otomatik üretilen PDF'e düşüyor" diye anlat. |

## Demoda yapılmayacaklar

- Migration, seed veya test betiği çalıştırmak (gerçek `local.db` üzerinde asla).
- `.env.local`, R2 dashboard'u, presigned URL imzası veya terminal geçmişi göstermek.
- Bütün admin formlarını tek tek dolaşmak.
- Silme işlemi yapmak (geri alınamaz); profesyonel CV'yi kaldırmak veya canlı değiştirmek.
- "Site yayında" demek; demo yerel ortamdır.
- ATS puanını işe alınma olasılığı olarak yorumlamak.
