export type TimelineEvent = {
  id: string;
  type: "education" | "experience";
  date: string;
  year: string;
  title: string;
  subtitle: string;
  description: string | null;
  href: string | null;
};

type TimelineInput = {
  education: Array<{ id: string; institution: string; program: string; startDate: string; description: string | null }>;
  experience: Array<{ id: string; organization: string; position: string; startDate: string; description: string | null }>;
};

function yearOf(date: string) {
  return /^\d{4}/.test(date) ? date.slice(0, 4) : date;
}

export function buildCareerTimeline(input: TimelineInput): TimelineEvent[] {
  const education: TimelineEvent[] = input.education.map((item) => ({
    id: `education-${item.id}`,
    type: "education",
    date: item.startDate,
    year: yearOf(item.startDate),
    title: item.institution,
    subtitle: /^[-–—\s]*$/.test(item.program) ? "" : item.program,
    description: item.description,
    href: null,
  }));
  const experience: TimelineEvent[] = input.experience.map((item) => ({
    id: `experience-${item.id}`,
    type: "experience",
    date: item.startDate,
    year: yearOf(item.startDate),
    title: item.position,
    subtitle: item.organization,
    description: item.description,
    href: null,
  }));
  return [...education, ...experience].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
