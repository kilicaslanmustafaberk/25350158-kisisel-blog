// "CV" opens the primary public CV (uploaded professional PDF, generated fallback) in a new tab;
// the structured Web CV stays at /cv.
export const primaryNavigation: readonly { href: string; label: string; newTab?: boolean }[] = [
  { href: "/", label: "Ana sayfa" },
  { href: "/projects", label: "Projeler" },
  { href: "/blog", label: "Blog" },
  { href: "/api/cv/pdf", label: "CV", newTab: true },
  { href: "/#contact", label: "İletişim" },
];

export const siteSections = [
  { id: "about", title: "Hakkımda", description: "Profesyonel özet, çalışma yaklaşımı ve odak alanları." },
  { id: "skills", title: "Yetenekler", description: "Teknik yetkinlikler ve kullanılan araçların anlaşılır dökümü." },
  { id: "projects", title: "Öne çıkan projeler", description: "Problem, çözüm, rol ve teknik mimariyle birlikte proje vaka çalışmaları." },
  { id: "blog", title: "Son blog yazıları", description: "Yazılım geliştirme sürecinden teknik notlar ve uzun biçimli içerikler." },
  { id: "journey", title: "Eğitim ve deneyim", description: "Akademik ve profesyonel gelişimin kronolojik görünümü." },
  { id: "cv", title: "CV", description: "Profesyonel PDF özgeçmiş ve yapılandırılmış verilerden üretilen web CV." },
  { id: "github", title: "GitHub", description: "Public profil, açık kaynak çalışmaları ve doğrulanabilir bağlantılar." },
  { id: "contact", title: "İletişim", description: "Güvenli ve doğrudan iletişim için güncel bağlantılar." },
] as const;
