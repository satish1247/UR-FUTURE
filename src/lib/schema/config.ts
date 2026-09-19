import { z } from "zod";
import { CATEGORIES, TRACKS } from "./enums";
import { httpsUrl, isoDateTime, list, plainText } from "./text";

export const SOURCE_KINDS = ["career-page", "ats-feed", "job-portal", "government"] as const;

export const ingestionConfigSchema = z.object({
  keywords: list(
    z.object({
      track: z.enum(TRACKS),
      category: z.enum(CATEGORIES),
      terms: list(plainText(80), 1, 40),
    }),
    1,
    40,
  ),
  sources: list(
    z.object({
      name: plainText(120),
      url: httpsUrl(),
      kind: z.enum(SOURCE_KINDS),
      tracks: list(z.enum(TRACKS), 1, 3),
      note: plainText(200).default("verify at runtime"),
    }),
    0,
    300,
  ),
  locations: list(plainText(80), 1, 60),
  maxMinYears: z.number().int().min(0).max(4).default(2),
  perRunCap: z.number().int().min(1).max(100).default(40),
  blockedHosts: list(plainText(120), 0, 50).default([]),
  /** Job-portal scrapers run through the Apify connector (pay-per-result; keep within the free $5/month). */
  apify: list(
    z.object({
      platform: plainText(40),
      actor: z.string().regex(/^[\w-]+\/[\w-]+$/,"must be username/actor-name"),
      maxResultsPerRun: z.number().int().min(1).max(500),
      input: z.record(z.string(), z.unknown()),
      note: plainText(300),
    }),
    0,
    10,
  ).default([]),
});
export type IngestionConfig = z.infer<typeof ingestionConfigSchema>;

export const ingestRunSchema = z.object({
  startedAt: isoDateTime,
  finishedAt: isoDateTime,
  found: z.number().int().nonnegative(),
  added: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: list(plainText(500), 0, 100).default([]),
  notes: z.string().trim().max(4000).default(""),
});
export type IngestRun = z.infer<typeof ingestRunSchema>;
