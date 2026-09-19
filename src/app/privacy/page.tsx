import type { Metadata } from "next";
import { DEVELOPER } from "@/config/developer";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-2xl space-y-6 py-16 text-[15px]">
      <p className="label">Privacy notice</p>
      <h1 className="display text-4xl">What we store and why</h1>
      <p>{SITE_NAME} is a free student project. Browsing jobs needs no account and stores nothing about you on our side.</p>
      <h2 className="text-lg font-medium text-ink">If you turn on job alerts</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Stored:</b> your email from Google sign-in; the profile you confirm (name, phone, college, degree, branch, graduation year, city, LinkedIn/GitHub links, and the resume content you add: summary, projects, internships, school education, certifications, achievements); your skills, job preferences and alert settings; and your Telegram chat ID if you connect Telegram.</li>
        <li><b>Not stored:</b> your resume file or its full text. It is read on your own device only to fill in your profile, which you check before saving. Resumes you download are created in your browser from your profile.</li>
        <li><b>Why:</b> only to show you your profile and send you new jobs that match your skills, at most once a day. Your profile is not shown to anyone else.</li>
        <li><b>Who processes it:</b> Google Firebase (database and sign-in), Brevo (sending emails), Telegram (if you connect it), Vercel (hosting). We never sell or share your data.</li>
      </ul>
      <h2 className="text-lg font-medium text-ink">Your choices</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Stop emails with the unsubscribe link in any email, or stop Telegram by sending /stop to the bot.</li>
        <li>Edit your profile anytime, or delete everything anytime with <b>Delete my data</b> on the Job alerts page. This removes your profile and sign-in account.</li>
        <li>The <b>My jobs</b> tracker is stored only in your browser, never on our servers.</li>
      </ul>
      <p>Questions: <a href={`mailto:${DEVELOPER.email}`} className="text-ink underline">{DEVELOPER.email}</a></p>
    </div>
  );
}
