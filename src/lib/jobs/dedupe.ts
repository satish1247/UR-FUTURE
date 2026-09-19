import { createHash } from "node:crypto";

const TRACKING_PARAM = /^(utm_.*|gclid|fbclid|msclkid|mc_cid|mc_eid|_hsenc|_hsmi|trk|ref_src|igshid)$/i;

/** Lowercase host, drop tracking params + hash, sort the rest, strip trailing slash. */
export function normalizeApplyUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  const kept = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAM.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(kept).toString();
  return url.toString().replace(/\/+$/, "").replace(/\/\?/, "?");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export interface DedupeFields {
  applyUrl: string;
  applyUrlStable?: boolean;
  company: { name: string };
  title: string;
  location: { city?: string };
}

export function dedupeKey(job: DedupeFields): string {
  if (job.applyUrlStable !== false) return sha256(normalizeApplyUrl(job.applyUrl));
  const parts = [job.company.name, job.title, job.location.city].map(normalizeText);
  return sha256(parts.join("|"));
}
