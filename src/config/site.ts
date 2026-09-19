// Rename the site here; nothing else hard-codes the name.
export const SITE_NAME = "UR Future";
export const SITE_TAGLINE = "Jobs and internships for engineering freshers";
export const SITE_DESCRIPTION =
  "Fresher jobs, internships and trainee roles for every engineering branch in Tamil Nadu, Puducherry, Bengaluru, Kerala and Andhra Pradesh: core, software and non-technical roles, with free learning paths and resume prompts.";

// One faint gradient orb in the home hero (design system signature). Set false to remove.
export const SHOW_HERO_ORB = true;

export const PAGE_SIZE = 20;
export const CLOSING_SOON_DAYS = 7;

/**
 * Public address of the site. Uses NEXT_PUBLIC_SITE_URL when set (and not blank),
 * otherwise Vercel's production domain, otherwise localhost for development.
 */
export function siteUrl(): string {
  const set = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = set || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return (/^https?:\/\//.test(url) ? url : `https://${url}`).replace(/\/+$/, "");
}
