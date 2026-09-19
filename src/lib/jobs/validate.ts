import type { z } from "zod";
import { CATEGORY_INFO } from "@/lib/schema/enums";
import { jobInputSchema, type JobInput } from "@/lib/schema/job";

// Login-walled or scraping-forbidden portals. Never accepted as source or apply link.
export const BLOCKED_HOSTS = ["linkedin.com", "naukri.com", "glassdoor.com", "glassdoor.co.in"];

export type ValidationResult =
  | { ok: true; job: JobInput }
  | { ok: false; errors: string[] };

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });
}

function isBlockedHost(url: string, blocked: readonly string[]): boolean {
  const host = new URL(url).hostname.toLowerCase();
  return blocked.some((b) => host === b || host.endsWith(`.${b}`));
}

/** Business rules zod cannot express alone (need the clock or config). */
function extraRules(job: JobInput, today: string, blocked: readonly string[]): string[] {
  const errors: string[] = [];
  const categoryTrack = CATEGORY_INFO[job.category].track;
  if (categoryTrack && categoryTrack !== job.track) {
    errors.push(`category: "${job.category}" belongs to track "${categoryTrack}", not "${job.track}"`);
  }
  if (job.deadline && job.deadline < today) {
    errors.push(`deadline: ${job.deadline} has already passed; only open postings are allowed`);
  }
  if (job.postedDate && job.postedDate > today) {
    errors.push(`postedDate: ${job.postedDate} is in the future`);
  }
  for (const field of ["applyUrl", "sourceUrl"] as const) {
    if (isBlockedHost(job[field], blocked)) {
      errors.push(`${field}: login-walled / scraping-forbidden site is not allowed`);
    }
  }
  return errors;
}

export function validateJobInput(
  data: unknown,
  now: Date = new Date(),
  extraBlockedHosts: readonly string[] = [],
): ValidationResult {
  const parsed = jobInputSchema.safeParse(data);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };

  const today = now.toISOString().slice(0, 10);
  const errors = extraRules(parsed.data, today, [...BLOCKED_HOSTS, ...extraBlockedHosts]);
  return errors.length ? { ok: false, errors } : { ok: true, job: parsed.data };
}
