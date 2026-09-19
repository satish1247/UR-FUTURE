// Pure logic for job alerts (no I/O), so it can be unit-tested.
import type { Job } from "@/lib/schema/job";
import type { UserProfile } from "@/lib/schema/user";
import { matchPercent } from "@/lib/skills";

export const MAX_JOBS_PER_DIGEST = 10;

export interface DigestItem {
  id: string;
  title: string;
  company: string;
  place: string;
  deadline?: string;
  match: number;
}

type DigestUser = Pick<UserProfile, "skills" | "prefs" | "minMatch" | "lastDigestAt" | "createdAt">;

/** New active jobs since the user's last digest that fit their preferences and skills, best match first. */
export function selectDigestJobs(jobs: Job[], user: DigestUser, today: string): DigestItem[] {
  const since = user.lastDigestAt ?? user.createdAt;
  const { tracks, categories, types, states } = user.prefs;
  const lowerStates = states.map((s) => s.toLowerCase());
  return jobs
    .filter(
      (j) =>
        j.status === "active" &&
        j.firstSeenAt > since &&
        (!j.deadline || j.deadline >= today) &&
        (!tracks.length || tracks.includes(j.track)) &&
        (!categories.length || categories.includes(j.category)) &&
        (!types.length || types.includes(j.type)) &&
        (!lowerStates.length || j.location.workMode === "remote" || lowerStates.includes((j.location.state ?? "").toLowerCase())),
    )
    .map((j) => ({ j, match: matchPercent(j.skills, user.skills) }))
    .filter(({ match }) => match >= user.minMatch)
    .sort((a, b) => b.match - a.match)
    .slice(0, MAX_JOBS_PER_DIGEST)
    .map(({ j, match }) => ({
      id: j.id,
      title: j.title,
      company: j.company.name,
      place: [j.location.city, j.location.state].filter(Boolean).join(", ") || j.location.country,
      deadline: j.deadline,
      match,
    }));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderEmail(opts: { name: string; items: DigestItem[]; siteUrl: string; siteName: string; unsubscribeUrl: string }) {
  const { name, items, siteUrl, siteName, unsubscribeUrl } = opts;
  const subject = `${items.length} new job${items.length > 1 ? "s" : ""} matching your skills · ${siteName}`;
  const rows = items
    .map(
      (i) => `<tr><td style="padding:14px 0;border-bottom:1px solid #e7e5e4">
<a href="${siteUrl}/jobs/${i.id}" style="color:#0c0a09;font-size:16px;font-weight:600;text-decoration:none">${esc(i.title)}</a>
<div style="color:#4e4e4e;font-size:14px">${esc(i.company)} · ${esc(i.place)}${i.deadline ? ` · Apply by ${i.deadline}` : ""}</div>
<div style="color:#16a34a;font-size:13px;font-weight:600">${i.match}% skill match</div></td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0c0a09">
<p>Hi ${esc(name)},</p><p>New jobs matching your resume skills:</p>
<table width="100%" cellspacing="0" cellpadding="0">${rows}</table>
<p><a href="${siteUrl}" style="color:#0c0a09">See all jobs</a> · <a href="${siteUrl}/profile" style="color:#0c0a09">Change alert settings</a></p>
<p style="color:#777169;font-size:12px">You get this because you turned on job alerts at ${esc(siteName)}. <a href="${unsubscribeUrl}" style="color:#777169">Unsubscribe</a></p></div>`;
  const text = [
    `Hi ${name},`,
    "New jobs matching your resume skills:",
    "",
    ...items.map((i) => `- ${i.title} — ${i.company}, ${i.place} (${i.match}% match): ${siteUrl}/jobs/${i.id}`),
    "",
    `Change settings: ${siteUrl}/profile`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
  return { subject, html, text };
}

export function renderTelegram(items: DigestItem[], siteUrl: string, siteName: string): string {
  const lines = items.map(
    (i) => `• <a href="${siteUrl}/jobs/${i.id}">${esc(i.title)}</a>\n   ${esc(i.company)} · ${esc(i.place)} · ${i.match}% match${i.deadline ? ` · by ${i.deadline}` : ""}`,
  );
  return `<b>${items.length} new job${items.length > 1 ? "s" : ""} for you</b> · ${esc(siteName)}\n\n${lines.join("\n\n")}\n\nSettings: ${siteUrl}/profile`;
}
