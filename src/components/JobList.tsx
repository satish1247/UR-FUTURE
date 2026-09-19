"use client";

import { useEffect, useMemo, useState } from "react";
import { matchPercent, type JobCardData } from "@/lib/jobs/filter";
import { JobCard } from "./JobCard";

const KEY = "urfuture:skills";

function loadSkills(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** Job list with the no-login "Match my skills" picker; everything stays in this browser. */
export function JobList({ jobs, sortByMatch }: { jobs: JobCardData[]; sortByMatch: boolean }) {
  const [known, setKnown] = useState<string[]>([]);
  // localStorage only exists after hydration; reading it during render would mismatch the server HTML.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setKnown(loadSkills()), []);

  const allSkills = useMemo(
    () => [...new Set(jobs.flatMap((j) => [...j.skills.mustHave, ...j.skills.niceToHave]))].sort((a, b) => a.localeCompare(b)),
    [jobs],
  );

  const toggle = (skill: string) => {
    const next = known.includes(skill) ? known.filter((s) => s !== skill) : [...known, skill];
    setKnown(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // private mode: matching still works for this visit
    }
  };

  const hasSkills = known.length > 0;
  const rows = jobs.map((job) => ({ job, match: hasSkills ? matchPercent(job.skills, known) : undefined }));
  if (sortByMatch && hasSkills) rows.sort((a, b) => (b.match ?? 0) - (a.match ?? 0));

  return (
    <div className="space-y-4">
      <details className="card p-4">
        <summary className="cursor-pointer text-[15px] font-medium text-ink">
          Match my skills {hasSkills && <span className="text-muted">({known.length} selected)</span>}
        </summary>
        <p className="mt-2 text-sm">Tick what you know. Saved only on this device — no login.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {allSkills.map((s) => (
            <button key={s} type="button" onClick={() => toggle(s)} className={known.includes(s) ? "chip-on" : "chip"} aria-pressed={known.includes(s)}>
              {s}
            </button>
          ))}
        </div>
      </details>
      {rows.length === 0 ? (
        <p className="card p-8 text-center">No jobs match these filters yet. Try removing a filter.</p>
      ) : (
        rows.map(({ job, match }) => <JobCard key={job.id} job={job} match={match} />)
      )}
    </div>
  );
}
