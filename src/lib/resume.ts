// Reads profile details out of resume text (in the browser). Heuristics, not AI: every field
// is shown to the student to check and edit before saving.
import { extractSkills } from "@/lib/skills";

export interface ResumeDetails {
  fullName?: string;
  email?: string;
  phone?: string;
  college?: string;
  degree?: string;
  branch?: string;
  gradYear?: number;
  city?: string;
  linkedin?: string;
  github?: string;
}

const DEGREES: [RegExp, string][] = [
  [/\bM\.?\s?Tech\b/i, "M.Tech"],
  [/\bB\.?\s?Tech\b/i, "B.Tech"],
  [/\bM\.E\.?(?=\s|,|$)|\bM\.?E\b(?=\s*[-–(,]|\s+in\b)/, "M.E."],
  [/\bB\.E\.?(?=\s|,|$)|\bB\.?E\b(?=\s*[-–(,]|\s+in\b)/, "B.E."],
  [/\bBachelor of Engineering\b/i, "B.E."],
  [/\bBachelor of Technology\b/i, "B.Tech"],
  [/\bDiploma\b/i, "Diploma"],
  [/\bB\.?\s?Sc\b/i, "B.Sc"],
  [/\bMCA\b/, "MCA"],
  [/\bBCA\b/, "BCA"],
  [/\bMBA\b/, "MBA"],
];

const BRANCHES: [RegExp, string][] = [
  [/robotics\s*(?:and|&)\s*automation|\bR\s?&\s?A\b|\bRAE\b/i, "Robotics and Automation"],
  [/mechatronics/i, "Mechatronics"],
  [/electrical\s*(?:and|&)\s*electronics|\bEEE\b/i, "Electrical and Electronics"],
  [/electronics\s*(?:and|&)\s*communication|\bECE\b/i, "Electronics and Communication"],
  [/electronics\s*(?:and|&)\s*instrumentation|instrumentation\s*(?:and|&)\s*control|\bEIE\b|\bICE\b/i, "Electronics and Instrumentation"],
  [/artificial intelligence\s*(?:and|&)\s*(?:data science|machine learning)|\bAI\s?&\s?(?:DS|ML)\b/i, "AI and Data Science"],
  [/computer science|\bCSE\b/i, "Computer Science"],
  [/information technology/i, "Information Technology"],
  [/mechanical/i, "Mechanical"],
  [/automobile/i, "Automobile"],
  [/aeronautical|aerospace/i, "Aeronautical"],
  [/civil engineering/i, "Civil"],
];

const CITIES = [
  "Puducherry", "Pondicherry", "Chennai", "Bengaluru", "Bangalore", "Hyderabad", "Pune", "Mumbai", "Delhi", "New Delhi", "Noida", "Gurugram", "Gurgaon",
  "Kolkata", "Coimbatore", "Madurai", "Trichy", "Tiruchirappalli", "Salem", "Vellore", "Cuddalore", "Villupuram", "Ahmedabad", "Vadodara", "Surat",
  "Kochi", "Thiruvananthapuram", "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Rajahmundry", "Kakinada", "Warangal", "Mysuru",
  "Mangaluru", "Nagpur", "Nashik", "Jaipur", "Lucknow", "Chandigarh", "Bhubaneswar", "Indore", "Bhopal",
];

const COLLEGE_RE = /\b(institute|college|university|polytechnic|IIT|NIT|IIIT|vidyalaya)\b/i;
const NOT_NAME = /\b(resume|curriculum|vitae|cv|profile|email|e-mail|phone|mobile|address|objective|summary|contact|linkedin|github|engineer|student)\b/i;

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase()) : s;

/** Drops dates, scores and separators so "ABC College | 2021-2025 | CGPA 8.2" becomes "ABC College". */
function cleanCollege(line: string): string {
  return line
    .split(/\s[|•·]\s|\t|\s{3,}/)[0]
    .replace(/\b(19|20)\d{2}\s*(?:(?:-|–|to)\s*(?:(?:19|20)\d{2}|present|current))?/gi, "")
    .replace(/\b(cgpa|gpa|percentage)\b.*$/i, "")
    .replace(/^[\s,:–-]+|[\s,:–-]+$/g, "")
    .trim();
}

function normalizeUrl(match: string | undefined, host: string, keepSegments: number): string | undefined {
  if (!match) return undefined;
  const path = match.replace(/^(https?:\/\/)?(www\.)?/i, "").split("/").slice(1, 1 + keepSegments).join("/");
  if (!path) return undefined;
  return host === "github.com" ? `https://github.com/${path}` : `https://www.${host}/${path}`;
}

const cityIn = (s: string) => CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(s));

export function parseResume(text: string, knownSkills: string[] = []): ResumeDetails & { skills: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const head = lines.slice(0, 8);

  const fullName = head
    .map((l) => l.replace(/[|,].*$/, "").trim())
    .find((l) => /^[A-Za-z][A-Za-z.' ]{2,48}$/.test(l) && l.split(" ").length <= 5 && l.split(" ").every((w) => /^[A-Z]/.test(w)) && !NOT_NAME.test(l) && !COLLEGE_RE.test(l));

  const email = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
  const phoneRaw = text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/)?.[0];
  const phone = phoneRaw ? `+91 ${phoneRaw.replace(/\D/g, "").slice(-10)}` : undefined;

  const collegeLine = lines.find((l) => COLLEGE_RE.test(l) && !/\b(school|higher secondary|hsc|sslc|cbse|matriculation)\b/i.test(l));
  const college = collegeLine ? titleCase(cleanCollege(collegeLine)) || undefined : undefined;

  const degreeLineIdx = lines.findIndex((l) => DEGREES.some(([re]) => re.test(l)));
  const degree = degreeLineIdx >= 0 ? DEGREES.find(([re]) => re.test(lines[degreeLineIdx]))?.[1] : undefined;

  // Prefer the branch written next to the degree, else anywhere in the resume.
  const nearDegree = degreeLineIdx >= 0 ? lines.slice(degreeLineIdx, degreeLineIdx + 3).join(" ") : "";
  const branch = (BRANCHES.find(([re]) => re.test(nearDegree)) ?? BRANCHES.find(([re]) => re.test(text)))?.[1];

  const eduText = degreeLineIdx >= 0 ? lines.slice(Math.max(0, degreeLineIdx - 1), degreeLineIdx + 4).join(" ") : "";
  const years = [...eduText.matchAll(/\b(20[1-3]\d)\b/g)].map((m) => Number(m[1]));
  const gradYear = years.length ? Math.max(...years) : undefined;

  const city = cityIn(head.join(" ")) ?? cityIn(collegeLine ?? "");
  const linkedin = normalizeUrl(text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_%-]+/i)?.[0], "linkedin.com", 2);
  const github = normalizeUrl(text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+/i)?.[0], "github.com", 1);

  return {
    fullName: fullName ? titleCase(fullName) : undefined,
    email,
    phone,
    college,
    degree,
    branch,
    gradYear,
    city: city === "Pondicherry" ? "Puducherry" : city === "Bangalore" ? "Bengaluru" : city,
    linkedin,
    github,
    skills: extractSkills(text, knownSkills),
  };
}

// ---- Sections (summary, projects, experience, other education, certifications, achievements) ----

type SectionKey = "summary" | "projects" | "experience" | "education" | "certifications" | "achievements" | "skills" | "other";

const HEADINGS: [RegExp, SectionKey][] = [
  [/^(career\s+)?(objective|summary|profile|about me|professional summary)$/i, "summary"],
  [/^(academic\s+|key\s+|major\s+|mini\s+)?projects?( undertaken)?$/i, "projects"],
  [/^(work\s+|professional\s+)?experience$|^internships?$|^internship experience$|^industrial (training|exposure|visits?)$|^trainings?$/i, "experience"],
  [/^(education|educational qualifications?|academic (details|qualifications?|background)|qualifications?)$/i, "education"],
  [/^(certifications?|certificates?|courses|online courses|licenses? (&|and) certifications?)$/i, "certifications"],
  [/^(achievements?|awards?|honou?rs|accomplishments|extra[- ]?curricular( activities)?|co[- ]?curricular( activities)?|activities|positions? of responsibility)$/i, "achievements"],
  [/^(technical\s+)?skills?( set| summary)?$|^core competencies$|^tools?( & technologies)?$/i, "skills"],
  [/^(languages?( known)?|hobbies|interests|personal (details|information|profile)|declaration|references|strengths)$/i, "other"],
];

const BULLET = /^[•●▪◦○■\-–*·>]\s*/;
const DATE_RE = /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)\d{2}(\s*(-|–|to)\s*(((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)\d{2}|present|current|now))?/i;

function splitSections(lines: string[]): Partial<Record<SectionKey, string[]>> {
  const out: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;
  for (const raw of lines) {
    const heading = raw.replace(/[:\s]+$/, "").trim();
    const hit = heading.length <= 40 ? HEADINGS.find(([re]) => re.test(heading)) : undefined;
    if (hit) {
      current = hit[1];
      out[current] ??= [];
      continue;
    }
    if (current) out[current]!.push(raw);
  }
  return out;
}

/** Groups "Title line" + following bullet lines. A non-bullet line starts a new item. */
function groupItems(lines: string[]): { head: string; points: string[] }[] {
  const items: { head: string; points: string[] }[] = [];
  for (const l of lines) {
    const isBullet = BULLET.test(l);
    const text = l.replace(BULLET, "").trim();
    if (!text) continue;
    if (!isBullet && (items.length === 0 || text.length <= 110)) items.push({ head: text, points: [] });
    else if (items.length) items[items.length - 1].points.push(text);
    else items.push({ head: text, points: [] });
  }
  return items;
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function parseSections(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const s = splitSections(lines);

  const summary = s.summary?.length ? cut(s.summary.map((l) => l.replace(BULLET, "")).join(" "), 700) : undefined;

  const projects = groupItems(s.projects ?? []).slice(0, 8).map(({ head, points }) => {
    const [title, ...rest] = head.split(/\s[|–—]\s|\s-\s/);
    const toolsLine = points.find((p) => /^(tools|tech(nologies)?|stack|software|hardware)\s*(used)?\s*:/i.test(p));
    const tools = toolsLine?.replace(/^[^:]+:\s*/, "") ?? (rest.join(", ") || undefined);
    const body = points.filter((p) => p !== toolsLine);
    return { title: cut(title.trim(), 120), tools: tools ? cut(tools, 200) : undefined, points: cut((body.length ? body : [head]).join("\n"), 1500) };
  });

  const experience = groupItems(s.experience ?? []).slice(0, 6).map(({ head, points }) => {
    const period = head.match(DATE_RE)?.[0];
    const clean = head.replace(DATE_RE, "").replace(/[|(),–—-]+\s*$/, "").trim();
    const [role, org] = clean.split(/\s(?:[|–—@]|-|at)\s/i).map((x) => x?.trim());
    return { role: cut(role || clean, 120), org: cut(org || role || clean, 120), period, points: cut((points.length ? points : [head]).join("\n"), 1500) };
  });

  // School / diploma rows (the main degree is in the profile details).
  const education = (s.education ?? [])
    .filter((l) => /\b(hsc|sslc|higher secondary|class\s*(x|xii|10|12)|secondary|diploma|cbse|matriculation|state board)\b/i.test(l))
    .slice(0, 4)
    .map((l) => {
      const clean = l.replace(BULLET, "");
      const year = clean.match(/\b(19|20)\d{2}\b(?!.*\b(19|20)\d{2}\b)/)?.[0];
      const score = clean.match(/(\d{1,3}(\.\d+)?\s?%|(cgpa|gpa)\s*:?\s*\d+(\.\d+)?)/i)?.[0];
      const parts = clean.replace(DATE_RE, "").replace(score ?? "", "").split(/\s[|,–—]\s|,\s|\s-\s/).map((x) => x.trim()).filter(Boolean);
      return { title: cut(parts[0] ?? clean, 120), institution: cut(parts[1] ?? parts[0] ?? clean, 160), year, score };
    });

  const list = (key: SectionKey, n: number, len: number) =>
    groupItems(s[key] ?? []).flatMap((i) => [i.head, ...i.points]).slice(0, n).map((x) => cut(x, len));

  return { summary, projects, experience, education, certifications: list("certifications", 15, 200), achievements: list("achievements", 15, 300) };
}
