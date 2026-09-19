import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CompanyLogo, formatSalary, JobCard, place } from "@/components/JobCard";
import { ResumePrompts } from "@/components/ResumePrompts";
import { ApplyButton, LearningPath, TrackPanel } from "@/components/Tracking";
import { toCard } from "@/lib/jobs/filter";
import { getActiveJobs, getJob } from "@/lib/jobs/repo";
import { createResumePrompt, upgradeResumePrompt } from "@/lib/jobs/resume-prompts";
import { CATEGORY_LABELS, JOB_TYPE_LABELS, TRACK_LABELS, WORK_MODE_LABELS } from "@/lib/schema/enums";

export const revalidate = 60;
const NOT_MENTIONED = "Not mentioned — check the official page";

export async function generateMetadata({ params }: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const job = await getJob((await params).id);
  if (!job) return { title: "Job not found" };
  const title = `${job.title} at ${job.company.name}`;
  return { title, description: job.summary, openGraph: { title, description: job.summary, type: "article" } };
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-hairline pt-8">
      <h2 className="display text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc space-y-1.5 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>
);

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const job = await getJob((await params).id);
  if (!job) notFound();

  if (job.status === "expired") {
    const similar = (await getActiveJobs()).filter((j) => j.track === job.track).slice(0, 3);
    return (
      <div className="container-page py-16">
        <p className="label">{job.company.name}</p>
        <h1 className="display mt-2 text-4xl">This job has closed</h1>
        <p className="mt-3">{job.title} is no longer accepting applications, and this page will be removed in a few days. Here are similar open roles:</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">{similar.map((j) => <JobCard key={j.id} job={toCard(j)} />)}</div>
        <Link href="/" className="btn-outline mt-8">See all jobs</Link>
      </div>
    );
  }

  const ref = {
    id: job.id,
    title: job.title,
    company: job.company.name,
    deadline: job.deadline,
    totalSteps: job.help.learningPath.reduce((n, s) => n + s.steps.length, 0),
  };
  const facts: [string, string][] = [
    ["Location", `${place(job.location)} · ${WORK_MODE_LABELS[job.location.workMode]}`],
    ["Experience", job.experience.label],
    ["Salary", job.salary ? formatSalary(job.salary) : NOT_MENTIONED],
    ["Vacancies", job.vacancies?.toString() ?? NOT_MENTIONED],
    ["Apply by", job.deadline ?? NOT_MENTIONED],
    ["Documents", job.documentsRequired.length ? job.documentsRequired.join(", ") : NOT_MENTIONED],
  ];
  if (job.eligibility.degrees.length || job.eligibility.branches.length) {
    facts.push(["Eligibility", [...job.eligibility.degrees, ...job.eligibility.branches].join(", ")]);
  }
  if (job.salaryEstimate) facts.push(["Estimated pay", `${job.salaryEstimate.range} (estimate: ${job.salaryEstimate.basis})`]);

  const skillGroups: [string, string[]][] = [
    ["Must have", job.skills.mustHave],
    ["Good to have", job.skills.niceToHave],
    ["Stand-out skills", job.skills.standOut],
  ];

  return (
    <article className="container-page max-w-3xl space-y-10 pb-32 pt-10 sm:pb-16">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} size={52} />
          <div>
            <p className="font-medium text-ink">
              {job.company.website ? <a href={job.company.website} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{job.company.name}</a> : job.company.name}
            </p>
            <p className="text-sm text-muted">{TRACK_LABELS[job.track]} · {CATEGORY_LABELS[job.category]}</p>
          </div>
        </div>
        <span className="badge">{JOB_TYPE_LABELS[job.type]}</span>
        <h1 className="display text-4xl sm:text-5xl">{job.title}</h1>
        <p className="text-base">{job.summary}</p>
        <div className="flex flex-wrap items-start gap-4">
          <ApplyButton job={ref} url={job.applyUrl} />
          <TrackPanel job={ref} />
        </div>
      </header>

      <dl className="card grid gap-4 p-5 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="label">{k}</dt>
            <dd className="mt-1 text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <Section title="What you will do"><Bullets items={job.responsibilities} /></Section>
      <Section title="Requirements"><Bullets items={job.requirements} /></Section>
      {job.selectionProcess?.length ? <Section title="Selection process"><Bullets items={job.selectionProcess} /></Section> : null}
      <Section title="What the company expects"><p>{job.help.whatCompanyExpects}</p></Section>

      <Section title="Skills">
        <div className="space-y-4">
          {skillGroups.filter(([, s]) => s.length).map(([label, skills]) => (
            <div key={label}>
              <p className="label">{label}</p>
              <div className="mt-2 flex flex-wrap gap-2">{skills.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            </div>
          ))}
          <p className="text-sm text-muted">Stand-out skills are extras that make your application stronger.</p>
        </div>
        <div className="mt-6"><p className="label">Close the gap</p><div className="mt-2"><Bullets items={job.help.skillGapTips} /></div></div>
      </Section>

      <Section title="Learning path">
        <LearningPath job={ref} path={job.help.learningPath} />
      </Section>

      <Section title="Resume prompt">
        <ResumePrompts create={createResumePrompt(job)} upgrade={upgradeResumePrompt(job)} />
      </Section>

      <footer className="border-t border-hairline pt-6 text-sm text-muted">
        Source: <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{job.sourceName}</a>
        {" · "}Last checked: {job.lastVerifiedAt.slice(0, 10)}
      </footer>
    </article>
  );
}
