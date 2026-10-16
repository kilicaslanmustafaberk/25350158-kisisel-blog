import type { CvSectionId } from "@/features/cv/validation";
import type { PublicCvData } from "@/server/cv/repository";

/** Shared by the web CV, the PDF generator and the ATS checker — a section only renders when explicitly visible AND non-empty. */
export function isSectionVisible(data: PublicCvData, id: CvSectionId) {
  return data.sectionVisibility[id] !== false;
}

export function sectionHasContent(data: PublicCvData, id: CvSectionId) {
  switch (id) {
    case "summary":
      return data.summary.trim().length > 0;
    case "skills":
      return data.skills.length > 0;
    case "projects":
      return data.projects.length > 0;
    case "experience":
      return data.experience.length > 0;
    case "education":
      return data.education.length > 0;
    case "certificates":
      return data.certificates.length > 0;
    default:
      return false;
  }
}

export function renderableSections(data: PublicCvData): CvSectionId[] {
  return data.sectionOrder.filter((id) => isSectionVisible(data, id) && sectionHasContent(data, id));
}
