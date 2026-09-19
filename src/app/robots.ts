import { siteUrl } from "@/config/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/my-jobs", "/profile"] }, sitemap: `${base}/sitemap.xml` };
}
