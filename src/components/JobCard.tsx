import Image from "next/image";
import Link from "next/link";
import type { JobCardData } from "@/lib/jobs/filter";
import { JOB_TYPE_LABELS, WORK_MODE_LABELS } from "@/lib/schema/enums";
import type { Job } from "@/lib/schema/job";

export function formatSalary(s: Job["salary"]): string {
  if (!s) return "Not disclosed";
  const inr = (n: number) => (s.currency === "INR" ? `₹${n.toLocaleString("en-IN")}` : `${s.currency} ${n.toLocaleString()}`);
  const per = { month: "/month", year: "/year", "stipend-month": "/month stipend" }[s.period];
  const range = s.min && s.max ? `${inr(s.min)}–${inr(s.max)}` : s.min ? `${inr(s.min)}+` : s.max ? `Up to ${inr(s.max)}` : "";
  return range ? `${range}${per}` : s.note ?? "Not disclosed";
}

export function CompanyLogo({ name, logoUrl, size = 44 }: { name: string; logoUrl?: string; size?: number }) {
  if (logoUrl) {
    return <Image src={logoUrl} alt={`${name} logo`} width={size} height={size} className="rounded-lg border border-hairline bg-surface object-contain" unoptimized />;
  }
  const initials = name.replace(/\(.*?\)/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-lg bg-surface-strong text-sm font-semibold text-ink" aria-hidden>
      {initials}
    </span>
  );
}

export const place = (l: Job["location"]) =>
  [l.city, l.state].filter(Boolean).join(", ") || l.country;

export function JobCard({ job, match }: { job: JobCardData; match?: number }) {
  return (
    <Link href={`/jobs/${job.id}`} className="card flex gap-4 p-5 transition-shadow hover:shadow-soft">
      <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">{JOB_TYPE_LABELS[job.type]}</span>
          {match !== undefined && <span className="badge bg-orb-mint/60">{match}% match</span>}
        </div>
        <h3 className="mt-2 text-lg font-medium leading-snug text-ink">{job.title}</h3>
        <p className="text-[15px]">
          {job.company.name} · {place(job.location)} · {WORK_MODE_LABELS[job.location.workMode]}
        </p>
        <p className="mt-1 text-[15px] text-ink">{formatSalary(job.salary)}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.mustHave.slice(0, 3).map((s) => (
            <span key={s} className="rounded-xs bg-canvas px-2 py-0.5 text-[13px]">{s}</span>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Posted {job.postedDate}
          {job.deadline && ` · Apply by ${job.deadline}`}
        </p>
      </div>
    </Link>
  );
}
