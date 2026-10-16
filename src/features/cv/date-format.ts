import type { CvSectionId } from "@/features/cv/validation";

/** ISO "YYYY-MM-DD" → "MM/YYYY". Single source of truth for CV date formatting (web + PDF). */
function toMonthYear(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${month}/${year}`;
}

export function formatCvDateRange(startDate: string, endDate: string | null, isCurrent: boolean, language: "tr" | "en"): string {
  const start = toMonthYear(startDate);
  if (isCurrent) return `${start} – ${language === "tr" ? "Devam Ediyor" : "Present"}`;
  if (!endDate) return start;
  return `${start} – ${toMonthYear(endDate)}`;
}

export const sectionLabels: Record<"tr" | "en", Record<CvSectionId, string>> = {
  tr: {
    summary: "Profesyonel Özet",
    skills: "Yetenekler",
    projects: "Projeler",
    experience: "Deneyim",
    education: "Eğitim",
    certificates: "Sertifikalar",
  },
  en: {
    summary: "Professional Summary",
    skills: "Skills",
    projects: "Projects",
    experience: "Experience",
    education: "Education",
    certificates: "Certificates",
  },
};

export const miscLabels: Record<"tr" | "en", { availableForWork: string; email: string; location: string; downloadPdf: string; viewCv: string }> = {
  tr: {
    availableForWork: "Yeni fırsatlara açık",
    email: "E-posta",
    location: "Konum",
    downloadPdf: "PDF indir",
    viewCv: "CV'yi görüntüle",
  },
  en: {
    availableForWork: "Open to new opportunities",
    email: "Email",
    location: "Location",
    downloadPdf: "Download PDF",
    viewCv: "View CV",
  },
};
