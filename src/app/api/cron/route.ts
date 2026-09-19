import { db } from "@/lib/firebase/admin";
import { deleteExpiredBefore, expireJob, refreshSite } from "@/lib/jobs/repo";
import { runDigest } from "@/lib/notify";
import type { Job } from "@/lib/schema/job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DAY = 86_400_000;
const DELETE_AFTER_DAYS = 7; // expired jobs show a "closed" page this long, then are deleted
const STALE_AFTER_DAYS = 45; // no deadline and not re-found by the daily task for this long
const GONE = new Set([404, 410]);

/** Only a definite 404/410 counts as dead; timeouts, 403 bot-blocks etc. are left alone. */
async function isGone(url: string): Promise<boolean> {
  const opts = { redirect: "follow" as const, signal: AbortSignal.timeout(8000), headers: { "user-agent": "URFutureLinkChecker/1.0" } };
  try {
    let res = await fetch(url, { ...opts, method: "HEAD" });
    if (res.status === 405 || res.status === 501) res = await fetch(url, { ...opts, method: "GET" });
    return GONE.has(res.status);
  } catch {
    return false;
  }
}

async function expireJobs(jobs: Job[], now: Date): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  const staleBefore = new Date(now.getTime() - STALE_AFTER_DAYS * DAY).toISOString();
  let expired = 0;
  for (const job of jobs) {
    const past = job.deadline !== undefined && job.deadline < today;
    const stale = job.deadline === undefined && job.lastVerifiedAt < staleBefore;
    if (past || stale || (await isGone(job.applyUrl))) {
      await expireJob(job.id, now);
      expired++;
    }
  }
  return expired;
}

async function pruneResources(jobs: Job[]): Promise<number> {
  let removed = 0;
  for (const job of jobs) {
    const path = await Promise.all(
      job.help.learningPath.map(async (step) => {
        const alive = [];
        for (const r of step.resources) {
          if (await isGone(r.url)) removed++;
          else alive.push(r);
        }
        return { ...step, resources: alive };
      }),
    );
    const learningPath = path.filter((s) => s.resources.length > 0);
    if (JSON.stringify(learningPath) !== JSON.stringify(job.help.learningPath)) {
      await db().collection("jobs").doc(job.id).update({ "help.learningPath": learningPath });
    }
  }
  return removed;
}

async function dailyTasks(jobs: Job[], now: Date) {
  const expired = await expireJobs(jobs, now);
  const deleted = await deleteExpiredBefore(new Date(now.getTime() - DELETE_AFTER_DAYS * DAY).toISOString());
  const old = await db().collection("rateLimits").where("expiresAt", "<", now).limit(500).get();
  await Promise.all(old.docs.map((d) => d.ref.delete()));
  // Alerts use the jobs still open after expiry.
  const open = (await db().collection("jobs").where("status", "==", "active").get()).docs.map((d) => d.data() as Job);
  const alerts = await runDigest(open, now);
  return { expired, deleted, alerts };
}

// Vercel Cron calls GET with "Authorization: Bearer $CRON_SECRET".
// ?task=expire (daily: expire + delete old expired + job alerts) | ?task=links (weekly: drop dead learning links)
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const task = new URL(req.url).searchParams.get("task");
  const snap = await db().collection("jobs").where("status", "==", "active").get();
  const jobs = snap.docs.map((d) => d.data() as Job);
  const now = new Date();

  // Sequential checks: fine for a few hundred jobs within 300s. Batch with Promise.all chunks if it times out.
  const result =
    task === "links"
      ? { removedResources: await pruneResources(jobs) }
      : await dailyTasks(jobs, now);
  refreshSite();
  return Response.json({ task: task ?? "expire", checked: jobs.length, ...result });
}
