import { CATEGORIES, JOB_TYPES, TRACKS, WORK_MODES } from "@/lib/schema/enums";
import type { Job } from "@/lib/schema/job";

export const SORTS = ["newest", "deadline", "match"] as const;
export const EXPERIENCE = ["fresher", "0-2"] as const;

export interface JobFilters {
  q?: string;
  track?: (typeof TRACKS)[number];
  category?: (typeof CATEGORIES)[number];
  type?: (typeof JOB_TYPES)[number];
  state?: string;
  workMode?: (typeof WORK_MODES)[number];
  exp?: (typeof EXPERIENCE)[number];
  posted?: 7 | 30;
  sort: (typeof SORTS)[number];
  page: number;
}

type Params = Record<string, string | string[] | undefined>;

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseFilters(p: Params): JobFilters {
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string).trim().slice(0, 80) : undefined) || undefined;
  const posted = Number(p.posted);
  return {
    q: str("q"),
    track: pick(p.track, TRACKS),
    category: pick(p.category, CATEGORIES),
    type: pick(p.type, JOB_TYPES),
    state: str("state"),
    workMode: pick(p.workMode, WORK_MODES),
    exp: pick(p.exp, EXPERIENCE),
    posted: posted === 7 || posted === 30 ? posted : undefined,
    sort: pick(p.sort, SORTS) ?? "newest",
    page: Math.max(1, Math.min(100, Number(p.page) || 1)),
  };
}

const postedAt = (j: Job) => j.postedDate ?? j.firstSeenAt.slice(0, 10);
const daysAgo = (today: string, n: number) =>
  new Date(Date.parse(today) - n * 86_400_000).toISOString().slice(0, 10);

function matchesQuery(j: Job, q: string): boolean {
  const hay = [j.title, j.company.name, ...j.skills.mustHave, ...j.skills.niceToHave, ...j.skills.standOut]
    .join(" ")
    .toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function filterJobs(jobs: Job[], f: JobFilters, today: string): Job[] {
  return jobs.filter(
    (j) =>
      (!j.deadline || j.deadline >= today) &&
      (!f.track || j.track === f.track) &&
      (!f.category || j.category === f.category) &&
      (!f.type || j.type === f.type) &&
      (!f.workMode || j.location.workMode === f.workMode) &&
      (!f.state || j.location.state?.toLowerCase() === f.state.toLowerCase()) &&
      (!f.exp || (f.exp === "fresher" ? j.experience.minYears === 0 : j.experience.minYears <= 2)) &&
      (!f.posted || postedAt(j) >= daysAgo(today, f.posted)) &&
      (!f.q || matchesQuery(j, f.q)),
  );
}

export function sortJobs(jobs: Job[], sort: JobFilters["sort"]): Job[] {
  const copy = [...jobs];
  if (sort === "deadline") {
    return copy.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  }
  // "match" is re-sorted in the browser (skills live in localStorage); newest is the base order.
  return copy.sort(
    (a, b) => postedAt(b).localeCompare(postedAt(a)),
  );
}

export function closingSoon(jobs: Job[], today: string, days: number): Job[] {
  const limit = daysAgo(today, -days);
  return jobs
    .filter((j) => j.deadline && j.deadline >= today && j.deadline <= limit)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
}

/** Jobs per category, for the chips (ignores the category filter itself). */
export function categoryCounts(jobs: Job[]): Partial<Record<Job["category"], number>> {
  const counts: Partial<Record<Job["category"], number>> = {};
  for (const j of jobs) counts[j.category] = (counts[j.category] ?? 0) + 1;
  return counts;
}

export const newToday = (jobs: Job[], today: string) => jobs.filter((j) => j.firstSeenAt.startsWith(today)).length;

export { matchPercent } from "@/lib/skills";

/** The slice of a job the list/card UI needs; keeps help content out of the client bundle. */
export function toCard(j: Job) {
  return {
    id: j.id,
    title: j.title,
    company: { name: j.company.name, logoUrl: j.company.logoUrl },
    location: j.location,
    type: j.type,
    track: j.track,
    salary: j.salary,
    postedDate: postedAt(j),
    deadline: j.deadline,
    skills: { mustHave: j.skills.mustHave, niceToHave: j.skills.niceToHave },
  };
}
export type JobCardData = ReturnType<typeof toCard>;
