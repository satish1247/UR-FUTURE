"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { authedFetch, useUser } from "@/lib/firebase/client";
import { createResumePrompt, upgradeResumePrompt, type PromptJob } from "@/lib/jobs/resume-prompts";
import { buildResume, describeVariant, pickVariant, toPlainText, VARIANTS, type ResumeProfile } from "@/lib/resume-builder/model";
import { ResumeDownload } from "./ResumeDownload";
import { ResumePrompts } from "./ResumePrompts";

/** Resume help on a job page: tailored download + ready-to-paste AI prompts filled with the student's profile. */
export function JobResumeTools({ job }: { job: PromptJob }) {
  const user = useUser();
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  // A random design brief per page view, so AI-written resumes don't all look alike.
  const [layoutIndex] = useState(() => Math.floor(Math.random() * VARIANTS.length));

  useEffect(() => {
    if (!user) return;
    authedFetch(user, "/api/profile")
      .then((r) => r.json())
      .then((d: { profile: (ResumeProfile & { email?: string }) | null }) => {
        if (d.profile?.details?.fullName) setProfile({ ...d.profile, email: d.profile.email ?? user.email ?? "" });
      })
      .catch(() => undefined);
  }, [user]);

  const resumeJob = { title: job.title, company: job.company.name, skills: job.skills };
  const prompts = useMemo(() => {
    const layout = describeVariant(profile ? pickVariant(profile.email + job.title, layoutIndex) : VARIANTS[layoutIndex]);
    const profileText = profile ? toPlainText(buildResume(profile)) : undefined;
    return { create: createResumePrompt(job, { profileText, layout }), upgrade: upgradeResumePrompt(job, { profileText, layout }) };
  }, [job, profile, layoutIndex]);

  return (
    <div className="space-y-5">
      {profile ? (
        <div className="card space-y-2 p-5">
          <p className="font-medium text-ink">Your resume for this job</p>
          <p className="text-sm">Made from your profile, with your skills that match this job listed first. Nothing is added that isn&apos;t in your profile.</p>
          <ResumeDownload profile={profile} job={resumeJob} />
        </div>
      ) : (
        <p className="text-sm">
          <Link href="/profile" className="font-medium text-ink underline underline-offset-4">Sign in and add your details</Link> to download a resume made for this job, and to get these prompts already filled with your details.
        </p>
      )}
      <ResumePrompts create={prompts.create} upgrade={prompts.upgrade} />
    </div>
  );
}
