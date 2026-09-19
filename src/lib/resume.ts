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
