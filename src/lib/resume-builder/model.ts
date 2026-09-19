// Turns a student profile (+ optionally a target job) into resume content, and defines the
// layout designs. Every design is single-column real text, the format ATS parsers read best;
// designs differ in fonts, colours, header, heading style, section order and skills layout.
import type { ProfileDetails, ResumeSections } from "@/lib/schema/user";
import { skillGroup, skillKeys } from "@/lib/skills";

export interface ResumeProfile {
  email: string;
  details: Partial<ProfileDetails> & { fullName: string };
  resume?: Partial<ResumeSections>;
  skills: string[];
}

export interface ResumeJob {
  title: string;
  company: string;
  skills: { mustHave: string[]; niceToHave: string[]; standOut: string[] };
}

export type SectionId = "summary" | "skills" | "projects" | "experience" | "education" | "certifications" | "achievements";

export interface ResumeData {
  name: string;
  headline: string;
  contact: string[];
  summary: string;
  skillGroups: { label: string; items: string[] }[];
  projects: { title: string; tools?: string; points: string[] }[];
  experience: { role: string; org: string; period?: string; points: string[] }[];
  education: { title: string; institution: string; year?: string; score?: string }[];
  certifications: string[];
  achievements: string[];
}

const toLines = (s: string) => s.split(/\r?\n/).map((l) => l.replace(/^[•●▪\-–*]\s*/, "").trim()).filter(Boolean);
const joinList = (items: string[]) => (items.length <= 2 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export function buildResume(p: ResumeProfile, job?: ResumeJob): ResumeData {
  const d = p.details;
  const r = p.resume ?? {};

  // For a job: skills the student really has that the job asks for come first. Nothing is added.
  const jobKeys = new Set(job ? [...job.skills.mustHave, ...job.skills.niceToHave, ...job.skills.standOut].flatMap(skillKeys) : []);
  const relevant = p.skills.filter((s) => skillKeys(s).some((k) => jobKeys.has(k)));
  const skills = [...relevant, ...p.skills.filter((s) => !relevant.includes(s))];

  const study = [d.degree, d.branch].filter(Boolean).join(" in ");
  const headline = [study, d.gradYear ? `Class of ${d.gradYear}` : undefined].filter(Boolean).join(" | ") || "Engineering graduate";
  const stillStudying = !!d.gradYear && d.gradYear >= new Date().getFullYear();
  const top = skills.slice(0, 4);
  const generated =
    `${study || "Engineering"} ${stillStudying ? "student" : "graduate"}${d.college ? ` from ${d.college}` : ""}` +
    `${top.length ? ` with hands-on skills in ${joinList(top)}` : ""}.` +
    `${r.projects?.length ? ` Built ${r.projects.length} project${r.projects.length > 1 ? "s" : ""} applying these skills to real problems.` : ""}`;
  const base = r.summary?.trim() || generated;
  const summary = job ? `${base} Seeking the ${job.title} role at ${job.company}.` : base;

  const groups = new Map<string, string[]>();
  for (const s of skills.filter((x) => !relevant.includes(x))) groups.set(skillGroup(s), [...(groups.get(skillGroup(s)) ?? []), s]);
  const skillGroups = [...(relevant.length ? [{ label: "Relevant to this role", items: relevant }] : []), ...[...groups].map(([label, items]) => ({ label, items }))];

  const mainEdu = d.college || d.degree ? [{ title: study || "Degree", institution: d.college ?? "", year: d.gradYear ? String(d.gradYear) : undefined }] : [];

  return {
    name: d.fullName,
    headline,
    contact: [d.phone, p.email, d.city, d.linkedin?.replace(/^https?:\/\/(www\.)?/, ""), d.github?.replace(/^https?:\/\/(www\.)?/, "")].filter((x): x is string => !!x),
    summary,
    skillGroups,
    projects: (r.projects ?? []).map((x) => ({ title: x.title, tools: x.tools, points: toLines(x.points) })),
    experience: (r.experience ?? []).map((x) => ({ role: x.role, org: x.org, period: x.period, points: toLines(x.points) })),
    education: [...mainEdu, ...(r.education ?? [])],
    certifications: r.certifications ?? [],
    achievements: r.achievements ?? [],
  };
}

// ---- Designs ----

export interface Variant {
  id: string;
  name: string;
  pdfFont: "helvetica" | "times";
  docxFont: string;
  accent: string; // hex, used for name + headings (ATS ignores colour)
  headerAlign: "left" | "center";
  heading: "caps-rule" | "title-underline" | "caps-bar" | "caps-spaced";
  skills: "grouped" | "inline";
  bullet: "•" | "–" | "›";
  scale: number; // body font size multiplier
  order: SectionId[];
  titles: Partial<Record<SectionId, string>>;
}

const ORDER_SKILLS_FIRST: SectionId[] = ["summary", "skills", "projects", "experience", "education", "certifications", "achievements"];
const ORDER_EDU_FIRST: SectionId[] = ["summary", "education", "skills", "projects", "experience", "certifications", "achievements"];
const ORDER_PROJECTS_FIRST: SectionId[] = ["summary", "projects", "skills", "experience", "education", "achievements", "certifications"];
const ORDER_EXPERIENCE_FIRST: SectionId[] = ["summary", "experience", "projects", "skills", "education", "certifications", "achievements"];

export const VARIANTS: Variant[] = [
  { id: "classic", name: "Classic", pdfFont: "times", docxFont: "Cambria", accent: "#1f2937", headerAlign: "center", heading: "caps-rule", skills: "grouped", bullet: "•", scale: 1, order: ORDER_EDU_FIRST, titles: { skills: "Technical Skills", projects: "Academic Projects" } },
  { id: "modern", name: "Modern", pdfFont: "helvetica", docxFont: "Calibri", accent: "#1d4ed8", headerAlign: "left", heading: "caps-bar", skills: "grouped", bullet: "•", scale: 1, order: ORDER_SKILLS_FIRST, titles: { skills: "Skills", projects: "Projects" } },
  { id: "engineer", name: "Engineer", pdfFont: "helvetica", docxFont: "Arial", accent: "#0f766e", headerAlign: "left", heading: "title-underline", skills: "grouped", bullet: "›", scale: 0.97, order: ORDER_PROJECTS_FIRST, titles: { skills: "Core Skills", projects: "Engineering Projects" } },
  { id: "compact", name: "Compact", pdfFont: "helvetica", docxFont: "Calibri", accent: "#111827", headerAlign: "center", heading: "caps-spaced", skills: "inline", bullet: "–", scale: 0.94, order: ORDER_SKILLS_FIRST, titles: { skills: "Skills", projects: "Projects", experience: "Internships & Training" } },
  { id: "executive", name: "Executive", pdfFont: "times", docxFont: "Georgia", accent: "#7f1d1d", headerAlign: "left", heading: "caps-rule", skills: "inline", bullet: "•", scale: 1.02, order: ORDER_EXPERIENCE_FIRST, titles: { skills: "Areas of Expertise", experience: "Experience" } },
  { id: "fresh", name: "Fresh", pdfFont: "helvetica", docxFont: "Verdana", accent: "#6d28d9", headerAlign: "center", heading: "title-underline", skills: "grouped", bullet: "•", scale: 0.95, order: ORDER_PROJECTS_FIRST, titles: { skills: "Skills & Tools", projects: "Projects" } },
  { id: "academic", name: "Academic", pdfFont: "times", docxFont: "Garamond", accent: "#14532d", headerAlign: "center", heading: "caps-spaced", skills: "grouped", bullet: "–", scale: 1.03, order: ORDER_EDU_FIRST, titles: { skills: "Technical Skills", projects: "Projects", achievements: "Achievements & Activities" } },
  { id: "minimal", name: "Minimal", pdfFont: "helvetica", docxFont: "Calibri", accent: "#374151", headerAlign: "left", heading: "caps-rule", skills: "inline", bullet: "›", scale: 0.98, order: ORDER_SKILLS_FIRST, titles: { skills: "Skills", projects: "Selected Projects" } },
];

export const DEFAULT_TITLES: Record<SectionId, string> = {
  summary: "Summary",
  skills: "Skills",
  projects: "Projects",
  experience: "Internships & Experience",
  education: "Education",
  certifications: "Certifications",
  achievements: "Achievements",
};

export const sectionTitle = (v: Variant, s: SectionId) => v.titles[s] ?? DEFAULT_TITLES[s];

/** Different students start on different designs; each further download moves to the next one. */
export function pickVariant(seed: string, downloadCount: number): Variant {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VARIANTS[(h + downloadCount) % VARIANTS.length];
}

/** Sections with content, in the design's order. */
export function sectionsToRender(data: ResumeData, v: Variant): SectionId[] {
  const has: Record<SectionId, boolean> = {
    summary: !!data.summary,
    skills: data.skillGroups.length > 0,
    projects: data.projects.length > 0,
    experience: data.experience.length > 0,
    education: data.education.length > 0,
    certifications: data.certifications.length > 0,
    achievements: data.achievements.length > 0,
  };
  return v.order.filter((s) => has[s]);
}

/** Plain-text resume (for AI prompts and tests). */
export function toPlainText(data: ResumeData, v: Variant = VARIANTS[1]): string {
  const out: string[] = [data.name, data.headline, data.contact.join(" | "), ""];
  for (const s of sectionsToRender(data, v)) {
    out.push(sectionTitle(v, s).toUpperCase());
    if (s === "summary") out.push(data.summary);
    if (s === "skills") for (const g of data.skillGroups) out.push(`${g.label}: ${g.items.join(", ")}`);
    if (s === "projects") for (const p of data.projects) out.push(`${p.title}${p.tools ? ` (${p.tools})` : ""}`, ...p.points.map((x) => `- ${x}`));
    if (s === "experience") for (const e of data.experience) out.push(`${e.role}, ${e.org}${e.period ? ` (${e.period})` : ""}`, ...e.points.map((x) => `- ${x}`));
    if (s === "education") for (const e of data.education) out.push([e.title, e.institution, e.year, e.score].filter(Boolean).join(", "));
    if (s === "certifications") out.push(...data.certifications.map((x) => `- ${x}`));
    if (s === "achievements") out.push(...data.achievements.map((x) => `- ${x}`));
    out.push("");
  }
  return out.join("\n").trim();
}

/** A layout brief for AI prompts, so students using the prompts also get different-looking resumes. */
export function describeVariant(v: Variant): string {
  const heading = {
    "caps-rule": "section headings in CAPITALS with a thin line under each",
    "title-underline": "section headings in Title Case, underlined",
    "caps-bar": "section headings in CAPITALS with a small coloured bar before them",
    "caps-spaced": "section headings in spaced CAPITALS",
  }[v.heading];
  const order = v.order.map((s) => sectionTitle(v, s)).join(" → ");
  return `Layout style "${v.name}": ${v.headerAlign === "center" ? "centred" : "left-aligned"} name and contact line, ${v.docxFont} font, ${heading}, section order ${order}, skills ${v.skills === "grouped" ? "grouped by area on separate lines" : "as one comma-separated line"}, bullets starting with "${v.bullet}". Keep it one column so ATS software can read it.`;
}
