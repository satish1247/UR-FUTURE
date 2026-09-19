import Link from "next/link";
import type { JobFilters } from "@/lib/jobs/filter";
import {
  CATEGORY_INFO,
  categoriesFor,
  JOB_TYPE_LABELS,
  JOB_TYPES,
  TRACK_LABELS,
  TRACKS,
  WORK_MODE_LABELS,
  WORK_MODES,
  type Category,
  type Track,
} from "@/lib/schema/enums";

type Key = "track" | "category" | "type";

function href(f: JobFilters, key: Key, value: string | undefined): string {
  // Switching track clears the category, since categories belong to one track.
  const merged = { ...f, [key]: value, page: undefined, ...(key === "track" ? { category: undefined } : {}) };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "sort" && v === "newest")) p.set(k, String(v));
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

function Toggle({ f, k, options, labels }: { f: JobFilters; k: Key; options: readonly string[]; labels: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={href(f, k, undefined)} className={!f[k] ? "chip-on" : "chip"}>All</Link>
      {options.map((o) => (
        <Link key={o} href={href(f, k, o)} className={f[k] === o ? "chip-on" : "chip"}>{labels[o]}</Link>
      ))}
    </div>
  );
}

function CategoryChip({ f, c, count }: { f: JobFilters; c: Category; count: number }) {
  const on = f.category === c;
  return (
    <Link href={href(f, "category", on ? undefined : c)} title={CATEGORY_INFO[c].hint} className={on ? "chip-on" : "chip"}>
      {CATEGORY_INFO[c].label}
      <span className={on ? "ml-2 text-white/70" : "ml-2 text-muted"}>{count}</span>
    </Link>
  );
}

/** Categories grouped by track; empty categories are hidden so every chip leads to jobs. */
function Categories({ f, counts }: { f: JobFilters; counts: Partial<Record<Category, number>> }) {
  const visible = (c: Category) => (counts[c] ?? 0) > 0 || f.category === c;
  const tracks: Track[] = f.track ? [f.track] : [...TRACKS];
  const groups: { key: string; heading?: string; cats: Category[] }[] = tracks.map((t) => ({
    key: t,
    heading: f.track ? undefined : TRACK_LABELS[t],
    cats: categoriesFor(t).filter((c) => CATEGORY_INFO[c].track === t && visible(c)),
  }));
  groups.push({ key: "other", cats: (["other"] as Category[]).filter(visible) });
  const shown = groups.filter((g) => g.cats.length > 0);
  if (shown.length === 0) return null;

  return (
    <details className="card p-4" open={!!f.category || !!f.track}>
      <summary className="cursor-pointer text-[15px] font-medium text-ink">
        Browse by category {f.category && <span className="text-muted">· {CATEGORY_INFO[f.category].label}</span>}
      </summary>
      <div className="mt-3 space-y-3">
        {shown.map((g) => (
          <div key={g.key}>
            {g.heading && <p className="label mb-2">{g.heading}</p>}
            <div className="flex flex-wrap gap-2">
              {g.cats.map((c) => <CategoryChip key={c} f={f} c={c} count={counts[c] ?? 0} />)}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

function Select({ name, value, label, options }: { name: string; value?: string | number; label: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input h-10 text-[15px]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export function Filters({ f, states, counts }: { f: JobFilters; states: string[]; counts: Partial<Record<Category, number>> }) {
  return (
    <div className="space-y-4">
      <Toggle f={f} k="track" options={TRACKS} labels={TRACK_LABELS} />
      <Toggle f={f} k="type" options={JOB_TYPES} labels={JOB_TYPE_LABELS} />
      <Categories f={f} counts={counts} />
      <form action="/" className="card grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        {f.track && <input type="hidden" name="track" value={f.track} />}
        {f.type && <input type="hidden" name="type" value={f.type} />}
        {f.category && <input type="hidden" name="category" value={f.category} />}
        <label className="flex flex-col gap-1 text-sm sm:col-span-3 lg:col-span-2">
          <span className="label">Search</span>
          <input name="q" defaultValue={f.q} placeholder="Title, company or skill (e.g. PLC, ROS2)" className="input h-10 text-[15px]" />
        </label>
        <Select name="state" value={f.state} label="State" options={[["", "Any"], ...states.map((s): [string, string] => [s, s])]} />
        <Select name="workMode" value={f.workMode} label="Work mode" options={[["", "Any"], ...WORK_MODES.map((m): [string, string] => [m, WORK_MODE_LABELS[m]])]} />
        <Select name="exp" value={f.exp} label="Experience" options={[["", "Any"], ["fresher", "Fresher"], ["0-2", "0-2 yrs"]]} />
        <Select name="posted" value={f.posted} label="Posted" options={[["", "Any time"], ["7", "Last 7 days"], ["30", "Last 30 days"]]} />
        <Select name="sort" value={f.sort} label="Sort" options={[["newest", "Newest"], ["deadline", "Deadline"], ["match", "Skill match"]]} />
        <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6">
          <button className="btn-primary">Show jobs</button>
          <Link href="/" className="btn-outline">Clear</Link>
        </div>
      </form>
    </div>
  );
}
