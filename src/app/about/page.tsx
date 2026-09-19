import type { Metadata } from "next";
import Image from "next/image";
import { DEVELOPER } from "@/config/developer";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = { title: "About" };

const HOW_IT_WORKS: [string, string][] = [
  ["Updated every day", "An AI assistant checks company career pages, public job boards, job portals and government apprenticeship portals, and adds new fresher-friendly roles."],
  ["Official links only", "Every Apply button opens the company's own page or the original public listing. We never ask for your details."],
  ["Closed jobs disappear", "Jobs past their deadline or with a dead link are marked closed and removed automatically a week later."],
  ["Learn what they ask for", "Each job lists must-have and stand-out skills, a free learning path and tips to close the gap."],
  ["ATS resume prompts", "Copy a prompt into any AI chat to build a new ATS-friendly resume, or to find the red flags in yours and upgrade it for that exact job."],
  ["Track your applications", "Save jobs, mark them Applied / Interview / Offer, tick off learning steps and keep notes in My jobs. It stays on your device — no login."],
];

export default function AboutPage() {
  const d = DEVELOPER;
  return (
    <div className="container-page max-w-3xl space-y-12 py-16">
      <section>
        <Image src="/logo.png" alt={SITE_NAME + " logo"} width={160} height={160} className="mb-6" />
        <p className="label">About</p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">A job board made for Robotics & Automation students</h1>
        <p className="mt-4 text-base">
          {SITE_NAME} collects fresher jobs, internships, apprenticeships and trainee roles across India for Robotics & Automation
          students — core hardware roles, software roles, and non-technical roles like technical sales and support — in one place, for free.
        </p>
      </section>

      <section>
        <h2 className="display text-2xl">How it works</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {HOW_IT_WORKS.map(([title, text]) => (
            <div key={title} className="card p-5">
              <h3 className="font-medium text-ink">{title}</h3>
              <p className="mt-1 text-[15px]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="display text-2xl">Who built this</h2>
        <div className="card mt-4 p-6">
          <div className="flex items-center gap-4">
            {d.photoUrl && <Image src={d.photoUrl} alt={d.name} width={72} height={72} className="rounded-full" unoptimized />}
            <div>
              <p className="text-xl font-medium text-ink">{d.name}</p>
              <p>{d.role}</p>
              <p className="text-sm text-muted">{d.department} · {d.college}</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line">{d.bio}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
            <a href={`mailto:${d.email}`} className="text-ink underline underline-offset-4">{d.email}</a>
            {d.phone && <a href={`tel:${d.phone}`} className="text-ink underline underline-offset-4">{d.phone}</a>}
            {d.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-4">{l.label}</a>
            ))}
          </div>
          <a href={`mailto:${d.email}?subject=${encodeURIComponent(`${SITE_NAME} feedback`)}`} className="btn-primary mt-6">Send feedback or report a wrong job</a>
        </div>
      </section>
    </div>
  );
}
