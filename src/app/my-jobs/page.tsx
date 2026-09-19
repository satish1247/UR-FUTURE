"use client";

import Link from "next/link";
import { progress, setNotes, setStatus, TRACK_STATUS_LABELS, TRACK_STATUSES, untrack, useTracker, type TrackStatus } from "@/lib/tracker";

export default function MyJobsPage() {
  const store = useTracker();
  const jobs = Object.values(store).sort((a, b) => (b.appliedAt ?? b.savedAt).localeCompare(a.appliedAt ?? a.savedAt));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="container-page max-w-3xl py-12">
      <p className="label">Tracker</p>
      <h1 className="display mt-2 text-4xl">My jobs</h1>
      <p className="mt-3">
        Jobs you saved or applied to, your status and your learning progress. Stored only on this device and browser — no login, nobody else can see it.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TRACK_STATUSES.map((s) => (
          <span key={s} className="badge">{TRACK_STATUS_LABELS[s]}: {jobs.filter((j) => j.status === s).length}</span>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="card mt-8 p-8 text-center">
          <p>Nothing tracked yet. Open a job and tap “Save to My jobs”, or apply — it is added automatically.</p>
          <Link href="/" className="btn-primary mt-4">Browse jobs</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {jobs.map((j) => {
            const ref = { id: j.id, title: j.title, company: j.company, deadline: j.deadline, totalSteps: j.totalSteps };
            const pct = progress(j);
            return (
              <li key={j.id} className="card space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/jobs/${j.id}`} className="text-lg font-medium text-ink underline-offset-4 hover:underline">{j.title}</Link>
                    <p className="text-[15px]">{j.company}</p>
                    <p className="text-sm text-muted">
                      {j.appliedAt ? `Applied ${j.appliedAt.slice(0, 10)}` : `Saved ${j.savedAt.slice(0, 10)}`}
                      {j.deadline && ` · ${j.deadline < today ? "Closed" : "Apply by"} ${j.deadline}`}
                    </p>
                  </div>
                  <select value={j.status} onChange={(e) => setStatus(ref, e.target.value as TrackStatus)} className="input h-10 w-auto text-[15px]" aria-label="Status">
                    {TRACK_STATUSES.map((s) => <option key={s} value={s}>{TRACK_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                {j.totalSteps > 0 && (
                  <div>
                    <div className="flex justify-between text-sm"><span>Learning path</span><span className="text-ink">{pct}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-surface-strong"><div className="h-2 rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
                  </div>
                )}
                <textarea
                  defaultValue={j.notes}
                  onBlur={(e) => setNotes(j.id, e.target.value)}
                  placeholder="Notes: interview date, contact person, what to prepare…"
                  rows={2}
                  className="w-full rounded-md border border-hairline-strong bg-surface p-3 text-[15px] text-ink"
                />
                <button type="button" onClick={() => untrack(j.id)} className="text-sm text-muted underline underline-offset-4">Remove</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
