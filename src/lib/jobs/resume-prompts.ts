import type { Job } from "@/lib/schema/job";

export const PLACEHOLDER_CREATE = "[MY DETAILS]";
export const PLACEHOLDER_UPGRADE = "[PASTE YOUR CURRENT RESUME HERE]";
export const PLACEHOLDER_MISSING = "[TO FILL]";

export type PromptJob = Pick<Job, "title" | "company" | "track" | "type" | "summary" | "skills" | "requirements" | "responsibilities" | "experience">;

const ATS_FORMAT = `ATS FORMAT RULES (follow all of them):
- One page, single column, plain text or simple Markdown. No tables, columns, text boxes, icons, images, photos, graphics or skill bars.
- Standard section headings only: Summary, Skills, Projects, Experience (internships count), Education, Certifications, Achievements.
- Contact details in the body (not a header/footer): name, phone, professional email, city, LinkedIn/GitHub links.
- Do not include photo, date of birth, gender, religion, marital status, father's name, or a "Declaration" section.
- Dates as "Mon YYYY - Mon YYYY". Reverse chronological order.
- Every bullet starts with a strong action verb, is one line where possible, and shows tools used and a result.
- Use the exact keyword spellings from the job description (for example "PLC" and "Programmable Logic Controller" once each).`;

const HONESTY = `HONESTY RULES:
- Never invent experience, projects, companies, numbers, grades or certificates. Use only what I give you.
- Where a number or detail would help but I have not given it, write ${PLACEHOLDER_MISSING} so I can fill it in.
- If I lack a required skill, do not claim it. Put it in the "Gaps to close" list instead.`;

function jobBlock(job: PromptJob): string {
  const keywords = [...new Set([...job.skills.mustHave, ...job.skills.niceToHave, ...job.skills.standOut])];
  return `TARGET JOB
Role: ${job.title} (${job.type}) at ${job.company.name}
Experience asked: ${job.experience.label}
About the role: ${job.summary}
Responsibilities:
${job.responsibilities.map((r) => `- ${r}`).join("\n")}
Requirements:
${job.requirements.map((r) => `- ${r}`).join("\n")}
Must-have keywords: ${job.skills.mustHave.join(", ")}
All ATS keywords to target: ${keywords.join(", ")}`;
}

const focusFor = (job: PromptJob) =>
  job.track === "non-technical"
    ? "Lead with customer-facing strengths (explaining technical products, demos, communication, coordination) backed by what I actually did, then technical basics."
    : "Lead with hands-on projects and internships: what I built, the hardware/software/tools used, and the measurable result.";

/** profileText: the student's saved profile as plain text; layout: a design brief so resumes differ. */
export interface PromptOptions {
  profileText?: string;
  layout?: string;
}

const layoutBlock = (layout?: string) => (layout ? `

LAYOUT: ${layout}` : "");

export function createResumePrompt(job: PromptJob, opts: PromptOptions = {}): string {
  if (opts.profileText) {
    return `You are an expert ATS resume writer for fresher engineering roles in India. Write my resume for the job below using my details.

${jobBlock(job)}

MY DETAILS:
${opts.profileText}

STEP 1 - Check my details against the job. If something important is missing (for example the result of a project, or a number), ask me up to 5 short questions and wait for my answers. If nothing important is missing, go straight to step 2.

STEP 2 - WRITE THE RESUME for this exact job. ${focusFor(job)} Put the most job-relevant project first. Write a 2-3 line Summary aimed at this role and company. Use the job's keywords wherever my details truthfully support them.${layoutBlock(opts.layout)}

${ATS_FORMAT}

${HONESTY}

STEP 3 - AFTER THE RESUME, give me:
- Keyword match: which ATS keywords above are covered and which are missing.
- Gaps to close: for each missing must-have skill, one small project I could finish in 1-2 weeks to prove it.
- A 3-line cover note I can paste into the application form.`;
  }
  return `You are an expert ATS resume writer for fresher engineering roles in India. Help me build a resume for the job below, from scratch.

${jobBlock(job)}

STEP 1 - INTERVIEW ME FIRST. Do not write the resume yet. Ask me short questions, one group at a time, and wait for my answers:
1) Contact details and links (LinkedIn, GitHub, portfolio)
2) Education: degree, branch, college, year, CGPA/percentage
3) Projects (academic and personal): problem, what I built, tools/hardware, my role, result
4) Internships, industrial training, part-time work
5) Skills and tools I can actually use, and at what level
6) Certifications, competitions, papers, clubs, positions of responsibility
Here is what I can share to start: ${PLACEHOLDER_CREATE}

STEP 2 - WRITE THE RESUME for this exact job. ${focusFor(job)} Put the most job-relevant project first. Write a 2-3 line Summary aimed at this role and company.${layoutBlock(opts.layout)}

${ATS_FORMAT}

${HONESTY}

STEP 3 - AFTER THE RESUME, give me:
- Keyword match: which ATS keywords above are covered and which are missing.
- Gaps to close: for each missing must-have skill, one small project I could finish in 1-2 weeks to prove it.
- A 3-line cover note I can paste into the application form.`;
}

export function upgradeResumePrompt(job: PromptJob, opts: PromptOptions = {}): string {
  return `You are an expert ATS resume reviewer and recruiter for fresher engineering roles in India. Review and upgrade my existing resume for the job below.

${jobBlock(job)}

MY CURRENT RESUME:
${opts.profileText ?? PLACEHOLDER_UPGRADE}

STEP 1 - ATS SCORE. Estimate how well my resume matches this job out of 100 and explain the score in 3 lines (keywords, relevance, formatting).

STEP 2 - RED FLAGS. List every problem you find, most serious first, and say why each one hurts. Check at least:
- ATS-breaking layout: tables, columns, text boxes, images, icons, skill bars/ratings, headers/footers holding contact info
- Missing must-have keywords from this job, or different spellings of them
- Generic or copied "Objective" instead of a targeted summary
- Weak bullets: duties instead of results, no numbers, no tools, starting with "Responsible for" or "Worked on"
- Irrelevant content for this role, or relevant projects buried at the bottom
- Unexplained gaps, inconsistent or missing dates, wrong order
- Spelling, grammar, inconsistent tense, formatting and font inconsistencies
- Unprofessional email, photo, date of birth, religion, marital status, "Declaration" section
- Longer than one page, walls of text, or too little content
- Claims that look exaggerated or unverifiable

STEP 3 - UPGRADED RESUME. Rewrite the full resume tailored to this job. ${focusFor(job)} Reorder sections and projects so the most relevant evidence comes first. Rewrite weak bullets as action + tools + result.${layoutBlock(opts.layout)}

${ATS_FORMAT}

${HONESTY}

STEP 4 - AFTER THE RESUME, give me:
- A before/after list of the main changes you made.
- The questions I must answer to fill every ${PLACEHOLDER_MISSING}.
- Gaps to close: missing must-have skills and one small project for each.`;
}
