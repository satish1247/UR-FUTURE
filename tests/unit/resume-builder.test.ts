import { describe, expect, it } from "vitest";
import { createResumePrompt, PLACEHOLDER_CREATE, PLACEHOLDER_UPGRADE, upgradeResumePrompt } from "@/lib/jobs/resume-prompts";
import { parseSections } from "@/lib/resume";
import { renderDocx } from "@/lib/resume-builder/docx";
import { buildResume, describeVariant, pickVariant, sectionsToRender, toPlainText, VARIANTS, type ResumeProfile } from "@/lib/resume-builder/model";
import { renderPdf } from "@/lib/resume-builder/pdf";
import { SAMPLE_JOBS } from "@/lib/seed/sample-jobs";

const profile: ResumeProfile = {
  email: "student@example.com",
  skills: ["Python", "SolidWorks", "PLC", "ROS2", "Communication"],
  details: { fullName: "Asha Kumar", phone: "+91 9876543210", college: "ABC Institute of Technology", degree: "B.Tech", branch: "Robotics and Automation", gradYear: 2026, city: "Puducherry", linkedin: "https://www.linkedin.com/in/asha" },
  resume: {
    projects: [{ title: "Pick-and-place arm", tools: "ROS2, ESP32", points: "Built a 4-DOF arm\n• Sorted parts by colour" }],
    experience: [{ role: "Automation intern", org: "XYZ Controls", period: "Jun 2025 - Jul 2025", points: "Programmed a PLC conveyor" }],
    education: [{ title: "HSC", institution: "ABC School", year: "2022", score: "92%" }],
    certifications: ["NPTEL Industrial Automation"],
    achievements: ["2nd place, robotics contest"],
  },
};
const job = SAMPLE_JOBS[0]; // Junior Robotics Engineer (ROS2): must-have ROS2, C++, Python, Linux

describe("resume content", () => {
  it("uses only the student's own data and writes a summary", () => {
    const r = buildResume(profile);
    expect(r.name).toBe("Asha Kumar");
    expect(r.headline).toBe("B.Tech in Robotics and Automation | Class of 2026");
    expect(r.summary).toContain("ABC Institute of Technology");
    expect(r.projects[0].points).toEqual(["Built a 4-DOF arm", "Sorted parts by colour"]);
    expect(r.education[0].institution).toBe("ABC Institute of Technology");
    expect(r.skillGroups.flatMap((g) => g.items).sort()).toEqual([...profile.skills].sort());
  });

  it("tailors to a job: matching skills first, role named, nothing invented", () => {
    const r = buildResume(profile, { title: job.title, company: job.company.name, skills: job.skills });
    expect(r.skillGroups[0]).toEqual({ label: "Relevant to this role", items: ["Python", "ROS2"] });
    expect(r.summary).toContain(`Seeking the ${job.title} role`);
    expect(r.skillGroups.flatMap((g) => g.items)).not.toContain("C++"); // job wants it, student doesn't have it
  });
});

describe("designs", () => {
  it("each download moves to a different design, and students start on different ones", () => {
    const seen = new Set(Array.from({ length: VARIANTS.length }, (_, i) => pickVariant("a@b.c", i).id));
    expect(seen.size).toBe(VARIANTS.length);
    expect(pickVariant("a@b.c", 0).id).not.toBe(pickVariant("a@b.c", 1).id);
  });

  it("designs really differ (font, header, headings, order)", () => {
    const signature = (v: (typeof VARIANTS)[number]) => [v.pdfFont, v.headerAlign, v.heading, v.skills, v.order.join()].join("|");
    expect(new Set(VARIANTS.map(signature)).size).toBe(VARIANTS.length);
  });

  it("skips empty sections and keeps the design's order", () => {
    const r = buildResume({ ...profile, resume: {} });
    expect(sectionsToRender(r, VARIANTS[0])).toEqual(["summary", "education", "skills"]);
  });

  it("plain text and layout brief are ready for AI prompts", () => {
    const text = toPlainText(buildResume(profile));
    expect(text).toContain("Pick-and-place arm (ROS2, ESP32)");
    expect(text).toContain("- Programmed a PLC conveyor");
    expect(describeVariant(VARIANTS[2])).toContain("Engineering Projects");
  });
});

describe("files", () => {
  it("generates a PDF with real text for every design", async () => {
    for (const v of VARIANTS) {
      const pdf = Buffer.from(await (await renderPdf(buildResume(profile, { title: job.title, company: job.company.name, skills: job.skills }), v)).arrayBuffer());
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.toString("latin1")).toContain("Asha Kumar");
    }
  });

  it("generates a Word document", async () => {
    const docx = Buffer.from(await (await renderDocx(buildResume(profile), VARIANTS[1])).arrayBuffer());
    expect(docx.subarray(0, 2).toString()).toBe("PK"); // .docx is a zip
    expect(docx.length).toBeGreaterThan(3000);
  });
});

describe("prompts with the student's profile", () => {
  it("fill the details in, so students only copy and paste", () => {
    const text = toPlainText(buildResume(profile));
    const create = createResumePrompt(job, { profileText: text, layout: describeVariant(VARIANTS[3]) });
    const upgrade = upgradeResumePrompt(job, { profileText: text });
    expect(create).toContain("Asha Kumar");
    expect(create).not.toContain(PLACEHOLDER_CREATE);
    expect(create).toContain('Layout style "Compact"');
    expect(upgrade).toContain("Pick-and-place arm");
    expect(upgrade).not.toContain(PLACEHOLDER_UPGRADE);
  });
});

describe("reading resume sections", () => {
  it("finds summary, projects, internships, school, certifications and achievements", () => {
    const s = parseSections(`ASHA KUMAR
CAREER OBJECTIVE
Robotics student who loves building automation systems.
EDUCATION
B.Tech Robotics and Automation, ABC Institute, 2026
Higher Secondary (HSC), ABC School, 2022, 92%
PROJECTS
Pick-and-place arm | ROS2, ESP32
• Built a 4-DOF arm
• Sorted parts by colour
INTERNSHIPS
Automation Intern - XYZ Controls | Jun 2025 - Jul 2025
• Programmed a PLC conveyor
CERTIFICATIONS
• NPTEL Industrial Automation
ACHIEVEMENTS
• 2nd place, robotics contest
DECLARATION
I hereby declare...`);
    expect(s.summary).toContain("building automation");
    expect(s.projects[0]).toMatchObject({ title: "Pick-and-place arm", tools: "ROS2, ESP32", points: "Built a 4-DOF arm\nSorted parts by colour" });
    expect(s.experience[0]).toMatchObject({ role: "Automation Intern", org: "XYZ Controls", period: "Jun 2025 - Jul 2025" });
    expect(s.education[0]).toMatchObject({ year: "2022", score: "92%" });
    expect(s.certifications).toEqual(["NPTEL Industrial Automation"]);
    expect(s.achievements).toEqual(["2nd place, robotics contest"]);
  });
});
