import { z } from "zod";
import {
  CATEGORIES,
  JOB_STATUSES,
  JOB_TYPES,
  RESOURCE_KINDS,
  SALARY_PERIODS,
  TRACKS,
  WORK_MODES,
} from "./enums";
import { httpsUrl, isoDate, isoDateTime, list, plainText, wordLimited } from "./text";

export const MAX_MIN_YEARS = 4; // skip roles asking 5+ years

const shortText = plainText(200);
const skillName = plainText(60);

const resourceSchema = z.object({
  title: plainText(160),
  url: httpsUrl(),
  platform: plainText(60),
  kind: z.enum(RESOURCE_KINDS),
  cost: z.literal("free", { message: 'must be "free" (paid or trial-only resources are not allowed)' }),
  verifiedAt: isoDateTime,
});

const learningStepSchema = z.object({
  skill: skillName,
  whyItMatters: plainText(300),
  steps: list(plainText(200), 3, 3),
  resources: list(resourceSchema, 1, 5),
});

export const helpSchema = z.object({
  whatCompanyExpects: wordLimited(40, 90),
  skillGapTips: list(plainText(300), 3, 5),
  learningPath: list(learningStepSchema, 1, 5),
});

const salarySchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter currency code like INR").default("INR"),
    period: z.enum(SALARY_PERIODS),
    note: plainText(200).optional(),
  })
  .refine((s) => s.min !== undefined || s.max !== undefined || s.note !== undefined, {
    message: "salary needs min, max or note; use null when the posting does not state pay",
  })
  .refine((s) => s.min === undefined || s.max === undefined || s.max >= s.min, {
    message: "salary.max must be >= salary.min",
  });

const experienceSchema = z
  .object({
    minYears: z
      .number()
      .int()
      .min(0)
      .max(MAX_MIN_YEARS, `roles asking ${MAX_MIN_YEARS + 1}+ years are out of scope`),
    maxYears: z.number().int().min(0).max(30).optional(),
    label: plainText(40),
  })
  .refine((e) => e.maxYears === undefined || e.maxYears >= e.minYears, {
    message: "experience.maxYears must be >= minYears",
  });

/** What the agent submits via MCP. Server-managed fields are excluded. */
export const jobInputSchema = z.object({
  track: z.enum(TRACKS),
  category: z.enum(CATEGORIES),
  type: z.enum(JOB_TYPES),
  title: plainText(140),
  summary: wordLimited(1, 60, 600),
  company: z.object({
    name: plainText(120),
    website: httpsUrl().optional(),
    /** Any public logo image; the server copies it to Cloudinary. */
    logoUrl: httpsUrl().optional(),
  }),
  location: z.object({
    city: plainText(80).optional(),
    state: plainText(80).optional(),
    country: plainText(80).default("India"),
    workMode: z.enum(WORK_MODES),
  }),
  experience: experienceSchema,
  eligibility: z
    .object({
      degrees: list(shortText, 0, 10).default([]),
      branches: list(shortText, 0, 15).default([]),
    })
    .default({ degrees: [], branches: [] }),
  salary: salarySchema.nullable(),
  salaryEstimate: z
    .object({ range: plainText(80), basis: plainText(200), sourceUrl: httpsUrl() })
    .optional(),
  vacancies: z.number().int().positive().nullable(),
  documentsRequired: list(shortText, 0, 15).default([]),
  selectionProcess: list(shortText, 0, 10).optional(),
  responsibilities: list(shortText, 4, 8),
  requirements: list(shortText, 4, 8),
  skills: z.object({
    mustHave: list(skillName, 1, 10),
    niceToHave: list(skillName, 0, 10),
    standOut: list(skillName, 0, 8),
  }),
  applyUrl: httpsUrl(),
  /** false when applyUrl is a generic careers page, so dedupe falls back to company|title|city. */
  applyUrlStable: z.boolean().default(true),
  sourceName: plainText(80),
  sourceUrl: httpsUrl(),
  postedDate: isoDate.optional(),
  deadline: isoDate.optional(),
  help: helpSchema,
});

export type JobInput = z.infer<typeof jobInputSchema>;

/** Stored document in `jobs/{id}`; id === dedupeKey. */
export const jobSchema = jobInputSchema.extend({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(JOB_STATUSES),
  isSample: z.boolean().default(false),
  firstSeenAt: isoDateTime,
  lastVerifiedAt: isoDateTime,
  updatedAt: isoDateTime,
  /** Set when expired; the daily cron deletes the job 7 days later. */
  expiredAt: isoDateTime.optional(),
});

export type Job = z.infer<typeof jobSchema>;
export type LearningStep = z.infer<typeof learningStepSchema>;
export type Resource = z.infer<typeof resourceSchema>;
