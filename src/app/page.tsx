import Link from "next/link";
import { Filters } from "@/components/Filters";
import { JobCard } from "@/components/JobCard";
import { JobList } from "@/components/JobList";
import { CLOSING_SOON_DAYS, PAGE_SIZE, SHOW_HERO_ORB, SITE_TAGLINE } from "@/config/site";
import { categoryCounts, closingSoon, filterJobs, newToday, parseFilters, sortJobs, toCard } from "@/lib/jobs/filter";
import { getActiveJobs } from "@/lib/jobs/repo";

export default async function Home({ searchParams }: PageProps<"/">) {
  const f = parseFilters(await searchParams);
  const today = new Date().toISOString().slice(0, 10);
  const all = await getActiveJobs();
  const results = sortJobs(filterJobs(all, f, today), f.sort);
  const shown = results.slice(0, f.page * PAGE_SIZE);
  const soon = closingSoon(all, today, CLOSING_SOON_DAYS).slice(0, 3);
  // Counts respect every filter except category, so chips show what each click would give.
  const counts = categoryCounts(filterJobs(all, { ...f, category: undefined }, today));
  const states = [...new Set(all.map((j) => j.location.state).filter((s): s is string => !!s))].sort();
  const isFiltered = Object.entries(f).some(([k, v]) => v !== undefined && !(k === "sort" && v === "newest") && k !== "page");
  const more = new URLSearchParams(Object.entries({ ...f, page: f.page + 1 }).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));

  return (
    <div className="container-page py-10 sm:py-16">
      <section className="relative mb-10 overflow-hidden">
        {SHOW_HERO_ORB && (
          <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-orb-mint opacity-40 blur-3xl sm:h-96 sm:w-96" />
        )}
        <p className="label relative">Robotics & Automation · India</p>
        <h1 className="display relative mt-3 max-w-3xl text-4xl sm:text-6xl">{SITE_TAGLINE}</h1>
        <p className="relative mt-4 max-w-2xl text-base">
          Core, software and non-technical roles for freshers — each with the skills to learn, free resources and a ready resume prompt.
          <span className="ml-1 font-medium text-ink">{newToday(all, today)} new today · {all.length} open now.</span>
        </p>
      </section>

      <Filters f={f} states={states} counts={counts} />

      {!isFiltered && soon.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-2xl">Closing soon</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {soon.map((j) => <JobCard key={j.id} job={toCard(j)} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="display text-2xl">{isFiltered ? `${results.length} matching` : "Latest"}</h2>
        <div className="mt-4">
          <JobList jobs={shown.map(toCard)} sortByMatch={f.sort === "match"} />
        </div>
        {shown.length < results.length && (
          <div className="mt-6 text-center">
            <Link href={`/?${more}`} scroll={false} className="btn-outline">Load more</Link>
          </div>
        )}
      </section>
    </div>
  );
}
