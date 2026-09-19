import { siteUrl } from "@/config/site";
import type { MetadataRoute } from "next";
import { getActiveJobs } from "@/lib/jobs/repo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const jobs = await getActiveJobs().catch(() => []);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about` },
    { url: `${base}/privacy` },
    ...jobs.map((j) => ({ url: `${base}/jobs/${j.id}`, lastModified: j.updatedAt })),
  ];
}
