import { describe, expect, it } from "vitest";
import { renderEmail, selectDigestJobs } from "@/lib/digest";
import type { Job } from "@/lib/schema/job";
import { profileInputSchema } from "@/lib/schema/user";
import { SAMPLE_JOBS } from "@/lib/seed/sample-jobs";
import { extractSkills, matchPercent } from "@/lib/skills";

process.env.CRON_SECRET = "x".repeat(64);
const { unsubscribeToken, verifyUnsubscribe } = await import("@/lib/users");

const TODAY = new Date().toISOString().slice(0, 10);
const jobs: Job[] = SAMPLE_JOBS.map((j, i) => ({
  ...j,
  id: String(i).padStart(64, "a"),
  status: "active",
  isSample: true,
  firstSeenAt: "2026-09-10T00:00:00.000Z",
  lastVerifiedAt: "2026-09-10T00:00:00.000Z",
  updatedAt: "2026-09-10T00:00:00.000Z",
}));
const plcJob = jobs.find((j) => j.title.startsWith("PLC"))!;

describe("skill extraction", () => {
  it("finds skills and synonyms in resume text", () => {
    const text = "B.Tech Robotics. Projects: conveyor sorter using Programmable Logic Controller and ladder diagram; HMI in TIA Portal. Python, C++, ROS 2, SolidWorks.";
    const found = extractSkills(text);
    for (const s of ["PLC", "Ladder logic", "HMI", "Siemens TIA Portal", "Python", "C++", "ROS2", "SolidWorks"]) expect(found).toContain(s);
    expect(found).not.toContain("C"); // "C++" must not also count as C
  });

  it("does not match inside other words", () => {
    expect(extractSkills("I like playing cricket and have a scholarship")).not.toContain("PLC");
  });

  it("matches job skills written differently from the student's", () => {
    expect(matchPercent({ mustHave: ["PLC ladder logic", "SCADA"], niceToHave: ["Siemens TIA Portal"] }, ["Programmable logic controller", "TIA portal"])).toBe(67);
  });
});

describe("job alert selection", () => {
  const base = { skills: ["PLC", "SCADA", "HMI"], prefs: { tracks: [], categories: [], types: [], states: [] }, minMatch: 40, createdAt: "2026-09-01T00:00:00.000Z" };

  it("picks new matching jobs, best match first", () => {
    const items = selectDigestJobs(jobs, { ...base, lastDigestAt: "2026-09-05T00:00:00.000Z" }, TODAY);
    expect(items[0].id).toBe(plcJob.id);
    expect(items.every((i) => i.match >= 40)).toBe(true);
  });

  it("skips jobs already sent, below the threshold, or outside preferences", () => {
    expect(selectDigestJobs(jobs, { ...base, lastDigestAt: "2026-09-11T00:00:00.000Z" }, TODAY)).toEqual([]);
    expect(selectDigestJobs(jobs, { ...base, minMatch: 100 }, TODAY)).toEqual([]);
    expect(selectDigestJobs(jobs, { ...base, prefs: { ...base.prefs, types: ["internship"] } }, TODAY).map((i) => i.id)).not.toContain(plcJob.id);
  });

  it("escapes job text in the email", () => {
    const mail = renderEmail({ name: "<b>A</b>", items: [{ id: "1", title: "<script>x</script>", company: "C", place: "P", match: 50 }], siteUrl: "https://s", siteName: "S", unsubscribeUrl: "https://s/u" });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });
});

describe("profile and unsubscribe", () => {
  it("requires consent and at least one skill", () => {
    const ok = { details: { fullName: "A Student", phone: "", gradYear: "2026", linkedin: "" }, skills: ["PLC"], prefs: {}, minMatch: 40, channels: { email: true, telegram: false }, consent: true };
    expect(profileInputSchema.safeParse(ok).success).toBe(true);
    expect(profileInputSchema.safeParse({ ...ok, consent: false }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...ok, skills: [] }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...ok, details: { fullName: "" } }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...ok, details: { ...ok.details, linkedin: "http://x.com" } }).success).toBe(false);
    const parsed = profileInputSchema.parse(ok);
    expect(parsed.details.gradYear).toBe(2026);
    expect(parsed.details.phone).toBeUndefined();
  });

  it("accepts only the signed unsubscribe token for that user", () => {
    const t = unsubscribeToken("user-1");
    expect(verifyUnsubscribe("user-1", t)).toBe(true);
    expect(verifyUnsubscribe("user-2", t)).toBe(false);
    expect(verifyUnsubscribe("user-1", "bad")).toBe(false);
  });
});

describe("sign-in token check", () => {
  it("rejects missing, garbage and wrongly signed tokens", async () => {
    process.env.FIREBASE_PROJECT_ID = "ur-future-2026";
    const { verifyIdToken } = await import("@/lib/firebase/verify-token");
    expect(await verifyIdToken("not-a-token")).toBeNull();
    const fake = [{ alg: "RS256", kid: "x" }, { sub: "u1", email: "a@b.c", aud: "ur-future-2026", iss: "https://securetoken.google.com/ur-future-2026", exp: 9999999999 }]
      .map((o) => Buffer.from(JSON.stringify(o)).toString("base64url"))
      .join(".") + ".c2lnbmF0dXJl";
    expect(await verifyIdToken(fake)).toBeNull();
  });
});

describe("skills across engineering branches", () => {
  it("finds civil, electrical, mechanical, software and business skills", () => {
    const found = extractSkills("Site engineer with AutoCAD, STAAD Pro, Primavera; ETAP load flow; SolidWorks, Six Sigma green belt; Java, Spring Boot, AWS, Selenium; SAP MM procurement. I want to express interest.");
    for (const s of ["AutoCAD", "STAAD Pro", "Primavera P6", "ETAP", "SolidWorks", "Six Sigma", "Java", "Spring Boot", "AWS", "Selenium", "SAP", "Procurement"]) expect(found).toContain(s);
    expect(found).not.toContain("Express.js");
  });
});
