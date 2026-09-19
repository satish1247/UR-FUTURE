import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { INGESTION_CONFIG } from "@/config/ingestion";
import { saveLogo } from "@/lib/logo";
import { dedupeKey } from "@/lib/jobs/dedupe";
import { expireJob, JOB_ID, listRecentJobs, logRun, refreshSite, upsertJob } from "@/lib/jobs/repo";
import { regionError, validateJobInput } from "@/lib/jobs/validate";
import { ingestRunSchema } from "@/lib/schema/config";
import { CATEGORY_INFO } from "@/lib/schema/enums";

function reply(data: Record<string, unknown>, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }], structuredContent: data, isError };
}

const CATEGORY_GUIDE = Object.entries(CATEGORY_INFO).map(([id, c]) => ({ id, track: c.track ?? "any", label: c.label, covers: c.hint }));

/** A fresh server per request (stateless transport). */
export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "ur-future-jobs", version: "2.0.0" });

  server.registerTool(
    "get_ingestion_config",
    {
      title: "Get ingestion config",
      description: "Returns search keywords per track/category, sources to check (career pages, ATS feeds, job portals, government portals — verify each URL at runtime), the category guide (which category belongs to which track), locations, maxMinYears, perRunCap and blockedHosts. Call this first on every run.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => reply({ config: INGESTION_CONFIG, categories: CATEGORY_GUIDE }),
  );

  server.registerTool(
    "list_recent_jobs",
    {
      title: "List recent jobs",
      description: "Lists jobs added or re-verified in the last N days (dedupeKey, title, company, applyUrl, status, deadline). Use it to skip postings already on the site and to pick jobs to re-check for expiry.",
      inputSchema: { days: z.number().int().min(1).max(90).default(30).describe("Look-back window in days, e.g. 30") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ days }) => {
      const jobs = await listRecentJobs(days);
      return reply({ count: jobs.length, jobs });
    },
  );

  server.registerTool(
    "upsert_job",
    {
      title: "Create or update a job",
      description: "Validates and saves one job. Idempotent: the same applyUrl (tracking params ignored) updates the existing job and re-activates it. If company.logoUrl is a public image URL, the server downloads and stores it automatically. Returns result 'created' | 'updated' | 'rejected'; on 'rejected', fix every listed error and retry once. Pass the full job object in `job` (fields per SCHEDULE_PROMPT.md).",
      inputSchema: { job: z.record(z.string(), z.unknown()).describe("The complete job object") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ job }) => {
      const checked = validateJobInput(job, new Date(), INGESTION_CONFIG.blockedHosts);
      if (!checked.ok) return reply({ result: "rejected", errors: checked.errors }, true);
      if (checked.job.experience.minYears > INGESTION_CONFIG.maxMinYears) {
        return reply({ result: "rejected", errors: [`experience.minYears: at most ${INGESTION_CONFIG.maxMinYears} years allowed`] }, true);
      }
      const outside = regionError(checked.job.location, INGESTION_CONFIG.regions);
      if (outside) return reply({ result: "rejected", errors: [outside] }, true);
      const id = dedupeKey(checked.job);
      const logoUrl = await saveLogo(checked.job.company.logoUrl, id.slice(0, 24));
      const { result } = await upsertJob({ ...checked.job, company: { ...checked.job.company, logoUrl } });
      refreshSite();
      return reply({ result, dedupeKey: id, url: `/jobs/${id}`, logo: logoUrl ? "saved" : "none (initials shown)" });
    },
  );

  server.registerTool(
    "mark_job_expired",
    {
      title: "Mark job expired",
      description: "Marks a job as expired by dedupeKey. It disappears from lists immediately and is deleted automatically a few days later. Use when a posting is closed, filled, or its page is gone.",
      inputSchema: { dedupeKey: z.string().regex(JOB_ID, "must be the 64-char hex dedupeKey from list_recent_jobs") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ dedupeKey: key }) => {
      const found = await expireJob(key);
      if (!found) return reply({ result: "not_found", error: "No job with that dedupeKey; check list_recent_jobs" }, true);
      refreshSite();
      return reply({ result: "expired", dedupeKey: key });
    },
  );

  server.registerTool(
    "log_run",
    {
      title: "Log run",
      description: "Records the run summary at the end: startedAt/finishedAt (ISO date-times), found, added, updated, skipped, errors[] and notes (sources checked, sites skipped and why).",
      inputSchema: ingestRunSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (run) => reply({ result: "logged", id: await logRun(ingestRunSchema.parse(run)) }),
  );

  return server;
}
