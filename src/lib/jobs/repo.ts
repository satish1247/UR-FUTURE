import "server-only";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/lib/firebase/admin";
import type { IngestRun } from "@/lib/schema/config";
import { normalizeCategory } from "@/lib/schema/enums";
import type { Job, JobInput } from "@/lib/schema/job";
import { dedupeKey } from "./dedupe";

const JOBS = "jobs";

/** Stored doc -> Job, mapping categories from older versions of the site. */
const toJob = (data: FirebaseFirestore.DocumentData): Job => ({ ...(data as Job), category: normalizeCategory(String(data.category)) });
// The whole active set is cached and filtered in memory; fine to a few thousand
// jobs. Past that, move filters into indexed Firestore queries.
const MAX_ACTIVE = 2000;
export const JOB_ID = /^[a-f0-9]{64}$/;

export const getActiveJobs = unstable_cache(
  async (): Promise<Job[]> => {
    const snap = await db().collection(JOBS).where("status", "==", "active").limit(MAX_ACTIVE).get();
    return snap.docs.map((d) => toJob(d.data()));
  },
  ["active-jobs"],
  { tags: [JOBS], revalidate: 300 },
);

export async function getJob(id: string): Promise<Job | null> {
  if (!JOB_ID.test(id)) return null;
  const doc = await db().collection(JOBS).doc(id).get();
  return doc.exists ? toJob(doc.data()!) : null;
}

/** Call after any job write so the site shows it within seconds. */
export function refreshSite(): void {
  try {
    revalidateTag(JOBS, { expire: 0 });
    revalidatePath("/", "layout");
  } catch {
    // Outside a Next request (seed script, tests) there is nothing to revalidate.
  }
}

export async function upsertJob(
  input: JobInput,
  now = new Date(),
  extra: Partial<Pick<Job, "isSample">> = {},
): Promise<{ result: "created" | "updated"; id: string }> {
  const id = dedupeKey(input);
  const ref = db().collection(JOBS).doc(id);
  const ts = now.toISOString();
  const result = await db().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const prev = existing.data() as Job;
      // Re-found open posting: refresh it and reactivate if it had been expired.
      const logoUrl = input.company.logoUrl ?? prev.company.logoUrl;
      tx.set(ref, {
        ...prev,
        ...input,
        ...extra,
        company: { ...input.company, logoUrl },
        id,
        status: "active",
        expiredAt: undefined,
        lastVerifiedAt: ts,
        updatedAt: ts,
      });
      return "updated" as const;
    }
    const job: Job = {
      ...input,
      id,
      status: "active",
      isSample: extra.isSample ?? false,
      firstSeenAt: ts,
      lastVerifiedAt: ts,
      updatedAt: ts,
    };
    tx.set(ref, job);
    return "created" as const;
  });
  return { result, id };
}

/** Marks a job expired; the daily cron deletes it a few days later. */
export async function expireJob(id: string, now = new Date()): Promise<boolean> {
  if (!JOB_ID.test(id)) return false;
  const ref = db().collection(JOBS).doc(id);
  if (!(await ref.get()).exists) return false;
  const ts = now.toISOString();
  await ref.update({ status: "expired", expiredAt: ts, updatedAt: ts });
  return true;
}

/** Permanently removes jobs that expired before the cutoff. Returns how many were deleted. */
export async function deleteExpiredBefore(cutoffIso: string): Promise<number> {
  const snap = await db().collection(JOBS).where("status", "==", "expired").get();
  const old = snap.docs.filter((d) => ((d.data() as Job).expiredAt ?? "") < cutoffIso);
  await Promise.all(old.map((d) => d.ref.delete()));
  return old.length;
}

export async function listRecentJobs(days: number) {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const snap = await db()
    .collection(JOBS)
    .where("updatedAt", ">=", cutoff)
    .select("title", "company", "applyUrl", "status", "deadline")
    .limit(1000)
    .get();
  return snap.docs.map((d) => {
    const j = d.data() as Pick<Job, "title" | "company" | "applyUrl" | "status" | "deadline">;
    return { dedupeKey: d.id, title: j.title, company: j.company.name, applyUrl: j.applyUrl, status: j.status, deadline: j.deadline ?? null };
  });
}

export async function logRun(run: IngestRun): Promise<string> {
  const ref = await db().collection("ingestRuns").add(run);
  return ref.id;
}

/** Fixed-window limiter shared across serverless instances. Returns false when over the limit. */
export async function hitRateLimit(key: string, maxPerMinute: number): Promise<boolean> {
  const minute = Math.floor(Date.now() / 60_000);
  const ref = db().collection("rateLimits").doc(`${key}-${minute}`);
  const count = await db().runTransaction(async (tx) => {
    const n = ((await tx.get(ref)).data()?.count as number | undefined) ?? 0;
    tx.set(ref, { count: n + 1, expiresAt: new Date((minute + 2) * 60_000) });
    return n + 1;
  });
  return count <= maxPerMinute;
}
