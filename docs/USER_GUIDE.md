# Kullanım Kılavuzu

## Profesyonel CV PDF — 1.9.0

Ziyaretçinin "CV" bağlantısı (menü, açılış sayfası, İletişim, `Ctrl+K`) artık sizin yüklediğiniz profesyonel PDF'i yeni sekmede açar. Yüklemediğiniz sürece sistem, yapılandırılmış verilerinizden otomatik oluşturduğu PDF'i gösterir. Web CV `/cv` adresinde kalmaya devam eder.

1. **İlk kez (bir kerelik):** 1.9.0 veritabanı migration'ını uygulayın: `npm run db:migrate`. Uygulanmadıysa admin CV sayfası bunu kırmızı bir uyarıyla belirtir ve yükleme pasif kalır.
2. Admin panelinde **CV** sayfasını açın. En üstteki **Profesyonel CV PDF** bölümünde Durum **Yüklenmedi** görünür.
3. **PDF seç** alanından CV'nizi seçin ve **PDF Yükle** düğmesine basın. Yalnız PDF kabul edilir, en fazla 5 MB. Dosya gerçekten PDF değilse (ör. adı `.pdf` yapılmış bir resim veya HTML) sunucu reddeder.
4. Başarılı yüklemeden sonra Durum **Yüklendi** olur; dosya adı, boyut ve yüklenme tarihi görünür.
5. **CV'yi Aç** PDF'i yeni sekmede açar, **İndir** dosya olarak indirir. İndirilen dosyanın adı sabittir (ör. `mustafa-berk-kilicaslan-cv.pdf`).
6. **Değiştir / Yeni PDF Yükle**: yeni dosya doğrulanana kadar eski CV yayında kalır; yükleme başarısız olursa mevcut CV değişmez.
7. **Profesyonel CV'yi kaldır**: onay ister. Kaldırıldıktan sonra ziyaretçiler otomatik oluşturulan PDF'i görür.

Bölüm sırası, görünürlük, CV başlığı ve özet ayarları Web CV'yi ve yedek PDF'i etkiler; yüklenen PDF'i değiştirmez. ATS Uyumluluk Kontrolü yapılandırılmış veri için bir kalite aracıdır. Yetenek ve profesyonel özet alanlarını doldurursanız Web CV ve ATS puanı zenginleşir, ama bunlar profesyonel PDF'i engellemez.

## Medya yapılandırması — 1.8.3

R2 ayarları tanımlıysa proje görseli ve blog kapağı gerçek R2 bucket'ına yüklenir; JPEG, PNG ve WebP kabul edilir, SVG/GIF ve 5 MB üstü dosyalar reddedilir. Yalnız `npm run dev` altında `*.r2.dev` görselleri aynı-origin `/api/media/r2` uç noktasından servis edilir (Türk Telekom ağındaki TLS ara cihaz sorunu nedeniyle); production'da bu uç nokta 404 döner ve teslim doğrudan R2/custom domain üzerindendir.

R2 bağlantı ayarları bulunmuyorsa proje görselleri ve blog kapakları için yükleme alanı açıklayıcı durum mesajıyla pasif görünür. Proje/blog metni ve diğer yönetim işlevleri kullanılabilir. R2 yapılandırıldıktan sonra yükleme alanı yeniden etkinleşir. Bu durum mevcut medya kayıtlarını silmez.


## Sertifikalar — 1.8.0 Phase 18

1. Admin panelinden **Certificates** bölümünü açın ve **Yeni sertifika ekle** seçin. Yalnız **Sertifika Adı** zorunludur; diğer alanları boş bırakabilirsiniz.
2. Veriliş/bitiş tarihlerini tarih alanlarıyla girin; bitiş tarihi verilişten önce olamaz. Doğrulama linki kullanırsanız `https://` adresi girin.
3. **Web Sitesinde Göster** açık kayıt landing'de görünebilir. CV'de görünmesi için bu seçenekle birlikte **CV'de Göster** de açık olmalıdır. Gizli kayıt public ve CV'de görünmez.
4. Listeden **Düzenle**, **Gizle/Göster**, **CV'ye ekle/CV'den çıkar**, **Yukarı/Aşağı** ve **Sil** işlemlerini kullanın. Silme onay ister.
5. Landing en fazla dört görünür kayıt gösterir; web/PDF CV ilgili tüm CV kayıtlarını kullanır. Boş isteğe bağlı alanlar için boş satır gösterilmez.

Aşağıdaki önceki sürüm açıklamaları tarihsel bağlam sağlar.

## 1.1.0 — Güncel UX ve CV davranışı (2026-09-26)

`shortBio` yalnız landing Hero'da; `longBio` Hakkımda'da kullanılır. CV özeti override → longBio → bölüm yok sırasını izler. Eğitim programı opsiyoneldir; boş/dash-only içerik render edilmez, eski kayıt değiştirilmez. Timeline yalnız eğitim ve deneyimdir; projeler showcase içinde kalır.

Profile `phone` / `isPhoneVisible` ve Social Links `showInCv` additive migration ile eklendi. Telefon güvenli `tel:` normalizasyonu ve görünürlük filtresiyle Contact/web CV/PDF'e ulaşır. CV ve CV shell yalnız `isVisible && showInCv` linklerini alır. GitHub/LinkedIn/Website CV varsayılanı true, diğerleri false; admin değiştirebilir. Instagram, Behance, Dribbble dahil platformlar desteklenir.

PDF artık yerel OFL lisanslı Noto Sans Regular/Bold TTF kullanır; Helvetica kararı bu sürümde geçersiz kılınmıştır. Tek kolon/selectable metin korunur. Terminal header yardımcı kontrolüne taşındı; footer bio/admin/version tekrarlarından arındırıldı. Landing arka planı fixed üç katman, rAF/CSS variables ve section IntersectionObserver kullanır; reduced-motion statiktir. Mevcut Three/Anime sistemleri korunur. FPS/ATS-vendor kabulü iddiası yoktur.

Güncel doğrulama ve sınırlamalar: [UX phase raporu](UX_PHASE_REPORT.md). Önceki phase test sayıları ve kararları tarihsel kayıttır.


Bu kılavuz site sahibinin yönetim panelinden içerik güncellemesi içindir. Cloud secret, veritabanı veya deployment işlemi içermez.

## 1. Admin Girişi

1. `/admin/login` sayfasını açın.
2. Yönetici e-posta ve parolanızı girin.
3. Başarılı girişten sonra admin ana sayfasına yönlendirilirsiniz.
4. Ortak veya güvenilmeyen cihazda işiniz bitince **Çıkış yap** düğmesini kullanın.

Hesap oluşturma ekranı yoktur. Yönetici hesabı geliştirici tarafından güvenilir terminalde hazırlanır.

## 2. Profil Düzenleme

`Admin > Profil` sayfasında Hero Kısa Tanıtımı yalnız Hero'da; Hakkımda yalnız longBio bölümünde kullanılır. Opsiyonel telefon, e-posta ve konumun ayrı görünürlük seçimleri vardır. Gizli alan public site/PDF payload'ına gönderilmez. Telefon örneği: `+90 (532) 123-45-67`.

## 3. Eğitim Ekleme

`Admin > Eğitim` bölümünde okul ve başlangıç tarihi gereklidir; program/bölüm opsiyoneldir. İlkokul/ortaokul/lise için boş bırakın; `--` yazmayın. Eğitim devam ediyorsa “Devam ediyor” seçilir ve bitiş tarihi boş bırakılır. Kayıtlar yukarı/aşağı taşınabilir.

## 4. Deneyim Ekleme

`Admin > Deneyim` bölümünde kurum, pozisyon, tarihler, açıklama ve görünürlük yönetilir. Devam eden deneyimde bitiş tarihi kullanılmaz. Görünmez kayıtlar public CV'de yer almaz.

## 5. Yetenek Ekleme

`Admin > Yetenekler` bölümünde ad, slug, kategori, açıklama ve görünürlük girilir. Slug küçük harf ve tire düzenindedir. Projelerde kullanılacak yetenekleri silmeden önce ilişkilerini kontrol edin.

## 6. Proje Oluşturma

`Admin > Projeler > Yeni proje` akışıyla:

- başlık, slug ve kısa açıklama,
- vaka çalışması için detay, problem, çözüm, rol ve mimari,
- durum, tarih ve ilişkili yetenekler,
- canlı URL ve repository görünürlüğü,
- öne çıkarma, yayınlama ve CV'ye dahil etme

alanlarını doldurun. Taslak proje public listede görünmez. Private repository seçildiğinde URL yönetimde saklanabilir fakat public sayfada gösterilmez.

## 7. Proje Cover ve Galeri

Önce proje kaydını oluşturun. Düzenleme sayfasındaki medya alanından desteklenen JPEG, PNG veya WebP dosyasını yükleyin; alt metni boş bırakmayın. Bir görsel cover olabilir, diğerleri galeri sırasına eklenir. R2 ayarları tanımlı değilse medya alanı açıklayıcı mesajla pasif görünür; bu durumda geliştiriciye başvurun.

## 8. Blog Yazısı

`Admin > Blog > Yeni yazı` sayfasında başlık, slug, özet, içerik, kategori, etiket, SEO alanları ve yayın durumu seçilir. Editör izin verilen başlık, paragraf, liste ve bağlantı gibi yapıları kullanır. Taslak yazı public sitede görünmez. Yayına almadan önce özet ve bağlantıları kontrol edin.

## 9. Kategori ve Etiket

Kategoriler `Admin > Blog > Kategoriler` alanında yönetilir. Yazı formundaki etiket alanı var olan veya yeni etiket ilişkilerini kullanır. Silme işleminden önce bağlı yazıları kontrol edin.

## 10. CV Ayarları

`Admin > CV` ekranında CV Profesyonel Özeti boşsa Hakkımda kullanılır; ikisi de boşsa özet bölümü gösterilmez. Hero metni CV'ye taşınmaz. Dil, bölüm görünürlüğü/sırası ve maksimum proje sayısı düzenlenebilir. CV'ye yalnız görünür eğitim/deneyim/yetenekler ve yayımlanmış “CV'ye dahil et” projeler gelir.

## 11. ATS Uyumluluk Kontrolü

Aynı ekrandaki ATS paneli eksik veya iyileştirilebilir alanları gösterir. Puan, projedeki sabit kurallara göre hesaplanır; gerçek bir işveren ATS sonucu veya işe alınma olasılığı değildir. Uyarıları profil/CV içeriğini iyileştirmek için kullanın.

## 12. PDF İndirme

Public `/cv` sayfasındaki PDF bağlantısını kullanın. PDF güncel filtrelenmiş CV'den üretilir; gizli telefon/e-posta/konum ve CV dışı sosyal linkler girmez. Yerel Noto Sans Türkçe karakterleri destekler; metin seçilebilir.

## 13. Sosyal Bağlantılar

`Admin > Social` bölümünde platform, etiket, HTTPS URL, Sitede göster ve CV'de göster seçimleri bağımsızdır. Instagram gibi bir bağlantıyı sitede açık, CV'de kapalı tutabilirsiniz. Yeni GitHub/LinkedIn/Website CV'de açık; diğer platformlar kapalı başlar. Checkbox ile değiştirebilirsiniz. GitHub profil URL'si gerekir; repository URL'si kabul edilmez.

## 14. Görünür ve Gizli İçerik

- Profilde e-posta/konum ayrı gizlenir.
- Eğitim, deneyim, yetenek ve sosyal bağlantıda görünürlük anahtarı vardır.
- Projede `published` public görünürlüğü; `includeInCv` CV seçimini belirler.
- Blogda `draft` görünmez, `published` görünürdür.
- Gizleme CSS ile yapılmaz; kayıt public sorgudan çıkarılır.

## 15. Hızlı Yayın Kontrolü

İçerik kaydından sonra ilgili public sayfayı yeni sekmede açın. Başlık, tarih, alt metin, görünürlük ve linkleri kontrol edin. Özel bilgi görürseniz kaydı hemen taslağa/gizliye alın ve geliştiriciye bildirin.
