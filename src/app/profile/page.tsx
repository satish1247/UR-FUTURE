import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";
import { getActiveJobs } from "@/lib/jobs/repo";
import { KNOWN_SKILL_NAMES } from "@/lib/skills";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your profile", robots: { index: false } };

export default async function ProfilePage() {
  const jobs = await getActiveJobs().catch(() => []);
  const jobSkills = [...new Set(jobs.flatMap((j) => [...j.skills.mustHave, ...j.skills.niceToHave, ...j.skills.standOut]))];
  const skillOptions = [...new Set([...KNOWN_SKILL_NAMES, ...jobSkills])].sort((a, b) => a.localeCompare(b));
  const states = [...new Set(jobs.map((j) => j.location.state).filter((s): s is string => !!s))].sort();
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="label">Your profile</p>
      <h1 className="display mt-2 text-4xl">Your free UR Future profile</h1>
      <ol className="mb-8 mt-4 grid gap-2 text-[15px] sm:grid-cols-3">
        <li className="card p-3"><b className="text-ink">1. Sign up</b> with Google — one tap.</li>
        <li className="card p-3"><b className="text-ink">2. Add your resume</b> — upload it, or enter your details and we make one.</li>
        <li className="card p-3"><b className="text-ink">3. Get matched jobs</b> — by email or Telegram, plus resumes to download.</li>
      </ol>
      <ProfileForm skillOptions={skillOptions} jobSkills={jobSkills} states={states} />
    </div>
  );
}
