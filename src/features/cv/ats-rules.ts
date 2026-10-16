import type { PublicCvData } from "@/server/cv/repository";

/**
 * Deterministic, explainable "ATS Uyum Kontrolü" (site-internal ATS compatibility
 * check). This is NOT a simulation of any real third-party ATS product (LinkedIn,
 * Workday, Greenhouse, etc.) — it only checks the formatting/content rules defined
 * below, all of which are pure functions of the same PublicCvData used to render
 * /cv and the PDF (single source of truth — see docs/DECISIONS.md ADR-030/031).
 */

export type AtsRuleStatus = "pass" | "warning" | "fail";

export type AtsRuleResult = {
  id: string;
  title: string;
  description: string;
  weight: number;
  status: AtsRuleStatus;
  applicable: boolean;
};

const MIN_SUMMARY_LENGTH = 40;
const MAX_SUMMARY_LENGTH = 600;

function rule(id: string, title: string, description: string, weight: number, status: AtsRuleStatus, applicable = true): AtsRuleResult {
  return { id, title, description, weight, status, applicable };
}

export function evaluateAtsRules(data: PublicCvData): AtsRuleResult[] {
  const results: AtsRuleResult[] = [];

  results.push(
    rule(
      "full-name",
      "Ad soyad mevcut",
      "CV'nin başında tam ad soyad bilgisi bulunmalıdır.",
      10,
      data.profile.fullName.trim().length >= 2 ? "pass" : "fail",
    ),
  );

  results.push(
    rule("headline", "Profesyonel unvan mevcut", "Kısa ve net bir unvan/başlık (headline) bulunmalıdır.", 8, data.profile.headline.trim().length >= 2 ? "pass" : "fail"),
  );

  results.push(
    rule(
      "contact-email",
      "E-posta görünür",
      "İletişim için e-posta adresi görünür olmalıdır. Gizli tutulması bir gizlilik tercihidir, bu nedenle uyarı (fail değil) olarak işaretlenir.",
      8,
      data.profile.email ? "pass" : "warning",
    ),
  );

  const summary = data.summary.trim();
  results.push(rule("summary-present", "Profesyonel özet mevcut", "CV'de bir profesyonel özet/profil metni bulunmalıdır.", 10, summary.length > 0 ? "pass" : "fail"));

  results.push(
    rule(
      "summary-length",
      "Özet uzunluğu makul",
      `Özet metni ${MIN_SUMMARY_LENGTH}-${MAX_SUMMARY_LENGTH} karakter aralığında olmalıdır; çok kısa veya çok uzun özetler okunabilirliği azaltır.`,
      6,
      summary.length >= MIN_SUMMARY_LENGTH && summary.length <= MAX_SUMMARY_LENGTH ? "pass" : "warning",
      summary.length > 0,
    ),
  );

  const skillCount = data.skills.length;
  results.push(
    rule("skills-present", "Yetenekler listelenmiş", "En az birkaç görünür yetenek bulunmalıdır (önerilen: 3+).", 10, skillCount === 0 ? "fail" : skillCount < 3 ? "warning" : "pass"),
  );

  results.push(rule("education-present", "Eğitim bilgisi mevcut", "En az bir görünür eğitim kaydı bulunmalıdır.", 10, data.education.length > 0 ? "pass" : "warning"));

  const hasExperience = data.experience.length > 0;
  const datesConsistent = data.experience.every((item) => item.isCurrent || !item.endDate || item.endDate >= item.startDate);
  results.push(
    rule(
      "experience-dates-consistent",
      "Deneyim tarihleri tutarlı",
      "Deneyim kayıtlarında bitiş tarihi başlangıç tarihinden önce olmamalıdır.",
      8,
      datesConsistent ? "pass" : "fail",
      hasExperience,
    ),
  );

  results.push(rule("project-selected", "En az bir proje seçilmiş", "CV için işaretlenmiş (includeInCv) en az bir yayınlanmış proje bulunmalıdır.", 8, data.projects.length > 0 ? "pass" : "warning"));

  results.push(
    rule(
      "standard-section-headings",
      "Standart bölüm başlıkları kullanılıyor",
      "Bölüm başlıkları (Profil/Yetenekler/Projeler/Deneyim/Eğitim/Sertifikalar veya İngilizce eşdeğerleri) sabit bir kütüphaneden gelir; yaratıcı/belirsiz başlık kullanılamaz.",
      6,
      "pass",
    ),
  );

  results.push(
    rule(
      "no-unsupported-graphics",
      "Grafik/skill-bar kullanılmıyor",
      "Şablon yapısal olarak skill percentage bar, ikon, grafik veya fotoğraf render etmez.",
      6,
      "pass",
    ),
  );

  results.push(
    rule(
      "text-based-content",
      "İçerik metin tabanlı",
      "PDF içeriği react-pdf `Text` node'ları olarak üretilir; hiçbir bölüm görsele dönüştürülmez, bu sayede seçilebilir/aranabilir kalır.",
      6,
      "pass",
    ),
  );

  return results;
}

export type AtsScore = { score: number; passedWeight: number; applicableWeight: number };

const statusCredit: Record<AtsRuleStatus, number> = { pass: 1, warning: 0.5, fail: 0 };

/** score = Σ(weight × credit) / Σ(applicable weight) × 100, rounded. Non-applicable rules are excluded from both sums. */
export function calculateAtsScore(results: AtsRuleResult[]): AtsScore {
  const applicable = results.filter((result) => result.applicable);
  const applicableWeight = applicable.reduce((sum, result) => sum + result.weight, 0);
  const passedWeight = applicable.reduce((sum, result) => sum + result.weight * statusCredit[result.status], 0);
  const score = applicableWeight === 0 ? 0 : Math.round((passedWeight / applicableWeight) * 100);
  return { score, passedWeight, applicableWeight };
}
