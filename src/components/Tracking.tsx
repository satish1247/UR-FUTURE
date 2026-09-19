"use client";

import Link from "next/link";
import type { LearningStep } from "@/lib/schema/job";
import { markApplied, progress, setStatus, toggleStep, TRACK_STATUS_LABELS, TRACK_STATUSES, untrack, useTracker, type JobRef, type TrackStatus } from "@/lib/tracker";

export function ApplyButton({ job, url }: { job: JobRef; url: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-canvas/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => markApplied(job)} className="btn-primary w-full sm:w-auto">
        Apply on company site ↗
      </a>
      <p className="mt-1.5 text-center text-xs text-muted sm:text-left">Opens the official page. We add it to My jobs as “Applied”.</p>
    </div>
  );
}

/** Save / status control shown on the job page. */
export function TrackPanel({ job }: { job: JobRef }) {
  const tracked = useTracker()[job.id];
  if (!tracked) {
    return (
      <button type="button" onClick={() => setStatus(job, "saved")} className="btn-outline">
        ☆ Save to My jobs
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-[15px]">
      <label className="flex items-center gap-2">
        <span className="label">My status</span>
        <select value={tracked.status} onChange={(e) => setStatus(job, e.target.value as TrackStatus)} className="input h-10 w-auto text-[15px]">
          {TRACK_STATUSES.map((s) => <option key={s} value={s}>{TRACK_STATUS_LABELS[s]}</option>)}
        </select>
      </label>
      <Link href="/my-jobs" className="font-medium text-ink underline underline-offset-4">My jobs</Link>
      <button type="button" onClick={() => untrack(job.id)} className="text-sm text-muted underline underline-offset-4">Remove</button>
    </div>
  );
}

/** Learning path with tick-boxes; progress is saved to My jobs on this device. */
export function LearningPath({ job, path }: { job: JobRef; path: LearningStep[] }) {
  const tracked = useTracker()[job.id];
  const done = tracked?.done ?? [];
  const pct = progress({ done, totalSteps: job.totalSteps });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-sm"><span>Your progress (saved on this device)</span><span className="font-medium text-ink">{pct}%</span></div>
        <div className="mt-1 h-2 rounded-full bg-surface-strong"><div className="h-2 rounded-full bg-success transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
      {path.map((step) => (
        <div key={step.skill} className="card p-5">
          <h3 className="text-lg font-medium text-ink">{step.skill}</h3>
          <p className="mt-1 text-[15px]">{step.whyItMatters}</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {step.steps.map((s, i) => {
              const key = `${step.skill}#${i}`;
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={done.includes(key)} onChange={() => toggleStep(job, key)} className="mt-1 h-4 w-4 accent-[var(--color-success)]" />
                    <span className={done.includes(key) ? "text-muted line-through" : ""}>{s}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <ul className="mt-3 space-y-1">
            {step.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-4">{r.title}</a>
                <span className="text-sm text-muted"> · {r.platform} · free</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
