/* eslint-disable @typescript-eslint/no-explicit-any -- tests build deliberately invalid payloads */
import { describe, expect, it } from "vitest";
import { dedupeKey, normalizeApplyUrl } from "@/lib/jobs/dedupe";
import { filterJobs, matchPercent, parseFilters, sortJobs } from "@/lib/jobs/filter";
import { validateJobInput } from "@/lib/jobs/validate";
import type { Job, JobInput } from "@/lib/schema/job";
import { hasHtml } from "@/lib/schema/text";
import { INGESTION_CONFIG } from "@/config/ingestion";
import { createResumePrompt, PLACEHOLDER_CREATE, PLACEHOLDER_MISSING, PLACEHOLDER_UPGRADE, upgradeResumePrompt } from "@/lib/jobs/resume-prompts";
import { ingestionConfigSchema } from "@/lib/schema/config";
import { CATEGORY_INFO } from "@/lib/schema/enums";
import { SAMPLE_JOBS } from "@/lib/seed/sample-jobs";

const NOW = new Date(); // sample dates are relative to today
const good = (): JobInput => structuredClone(SAMPLE_JOBS[0]);
const errorsFor = (job: unknown) => {
  const r = validateJobInput(job, NOW);
  return r.ok ? [] : r.errors.join("\n");
};

describe("validator", () => {
  it("accepts every sample job", () => {
    for (const job of SAMPLE_JOBS) expect(errorsFor(job)).toEqual([]);
  });

  it.each([
    ["bad track", (j: any) => (j.track = "hardware"), "track"],
    ["bad category", (j: any) => (j.category = "mechanical"), "category"],
    ["category from another track", (j: any) => (j.category = "technical-sales"), 'belongs to track "non-technical"'],
    ["bad type", (j: any) => (j.type = "fulltime"), "type"],
    ["http applyUrl", (j: any) => (j.applyUrl = "http://example.com/x"), "applyUrl: must be a valid https:// URL"],
    ["http resource", (j: any) => (j.help.learningPath[0].resources[0].url = "http://x.com"), "help.learningPath.0.resources.0.url"],
    ["paid resource", (j: any) => (j.help.learningPath[0].resources[0].cost = "paid"), 'must be "free"'],
    ["summary > 60 words", (j: any) => (j.summary = "word ".repeat(61)), "summary: must be 1-60 words"],
    ["too few responsibilities", (j: any) => (j.responsibilities = ["a", "b"]), "responsibilities: needs at least 4"],
    ["HTML in text", (j: any) => (j.title = "<b>Engineer</b>"), "title: must be plain text"],
    ["5+ years", (j: any) => (j.experience.minYears = 5), "out of scope"],
    ["past deadline", (j: any) => (j.deadline = "2026-01-01"), "has already passed"],
    ["LinkedIn apply link", (j: any) => (j.applyUrl = "https://www.linkedin.com/jobs/view/1"), "login-walled"],
  ])("rejects %s with a readable reason", (_name, mutate, expected) => {
    const job = good();
    mutate(job);
    expect(errorsFor(job)).toContain(expected);
  });

  it("detects HTML but allows plain symbols", () => {
    expect(hasHtml("R&D, a < b")).toBe(false);
    expect(hasHtml("x <script>")).toBe(true);
    expect(hasHtml("&nbsp;")).toBe(true);
  });
});

describe("dedupe", () => {
  it("normalises host, tracking params and trailing slash", () => {
    expect(normalizeApplyUrl("https://Jobs.Example.com/a/?utm_source=x&id=2&gclid=1#top")).toBe(
      "https://jobs.example.com/a?id=2",
    );
  });

  it("same posting via different tracking links gives the same key", () => {
    const a = { ...good(), applyUrl: "https://example.com/job/1?utm_campaign=a" };
    const b = { ...good(), applyUrl: "https://EXAMPLE.com/job/1/" };
    expect(dedupeKey(a)).toBe(dedupeKey(b));
  });

  it("falls back to company|title|city when the URL is not stable", () => {
    const a = { ...good(), applyUrlStable: false, applyUrl: "https://example.com/careers" };
    const b = { ...a, applyUrl: "https://example.com/careers?page=2" };
    expect(dedupeKey(a)).toBe(dedupeKey(b));
    expect(dedupeKey(a)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("filters", () => {
  const jobs = SAMPLE_JOBS.map(
    (j, i): Job => ({ ...j, id: String(i).padStart(64, "0"), status: "active", isSample: true, firstSeenAt: NOW.toISOString(), lastVerifiedAt: NOW.toISOString(), updatedAt: NOW.toISOString() }),
  );
  const today = NOW.toISOString().slice(0, 10);

  it("ignores unknown enum values in the URL", () => {
    expect(parseFilters({ track: "evil", sort: "x" })).toMatchObject({ track: undefined, sort: "newest", page: 1 });
  });

  it("filters by track, type and search text", () => {
    expect(filterJobs(jobs, parseFilters({ track: "non-technical" }), today)).toHaveLength(3);
    expect(filterJobs(jobs, parseFilters({ type: "internship" }), today).every((j) => j.type === "internship")).toBe(true);
    expect(filterJobs(jobs, parseFilters({ q: "opencv" }), today)[0].title).toContain("Computer Vision");
  });

  it("sorts by deadline with no-deadline jobs last", () => {
    const sorted = sortJobs(jobs, "deadline");
    expect(sorted[0].deadline! <= sorted[1].deadline!).toBe(true);
    expect(sorted.at(-1)!.deadline).toBeUndefined();
  });

  it("computes match percentage case-insensitively", () => {
    expect(matchPercent({ mustHave: ["ROS2", "Python"], niceToHave: ["Gazebo", "C++"] }, ["python", "ros2"])).toBe(50);
    expect(matchPercent({ mustHave: [], niceToHave: [] }, ["x"])).toBe(0);
  });
});

describe("resume prompts", () => {
  const job = SAMPLE_JOBS[0];

  it("build-new prompt interviews first, targets the job's keywords and keeps placeholders", () => {
    const p = createResumePrompt(job);
    for (const s of [PLACEHOLDER_CREATE, PLACEHOLDER_MISSING, job.title, job.company.name, ...job.skills.mustHave, "INTERVIEW ME FIRST", "ATS FORMAT RULES", "Never invent"]) {
      expect(p).toContain(s);
    }
  });

  it("upgrade prompt scores, lists red flags, then rewrites for the job", () => {
    const p = upgradeResumePrompt(job);
    for (const s of [PLACEHOLDER_UPGRADE, PLACEHOLDER_MISSING, "ATS SCORE", "RED FLAGS", "UPGRADED RESUME", "Missing must-have keywords", ...job.requirements]) {
      expect(p).toContain(s);
    }
  });
});

describe("ingestion config", () => {
  it("is valid and every keyword category belongs to its track", () => {
    expect(() => ingestionConfigSchema.parse(INGESTION_CONFIG)).not.toThrow();
    for (const k of INGESTION_CONFIG.keywords) expect(CATEGORY_INFO[k.category].track).toBe(k.track);
  });
});
