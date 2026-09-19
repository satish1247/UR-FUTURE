import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";
import { getActiveJobs } from "@/lib/jobs/repo";
import { KNOWN_SKILL_NAMES } from "@/lib/skills";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Job alerts", robots: { index: false } };

export default async function ProfilePage() {
  const jobs = await getActiveJobs().catch(() => []);
  const jobSkills = [...new Set(jobs.flatMap((j) => [...j.skills.mustHave, ...j.skills.niceToHave, ...j.skills.standOut]))];
  const skillOptions = [...new Set([...KNOWN_SKILL_NAMES, ...jobSkills])].sort((a, b) => a.localeCompare(b));
  const states = [...new Set(jobs.map((j) => j.location.state).filter((s): s is string => !!s))].sort();
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="label">Job alerts</p>
      <h1 className="display mt-2 text-4xl">Jobs that match your resume</h1>
      <p className="mb-8 mt-3">Add your resume once. Every day, new jobs that fit your skills are sent to you by email or Telegram.</p>
      <ProfileForm skillOptions={skillOptions} jobSkills={jobSkills} states={states} />
    </div>
  );
}
