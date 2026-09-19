"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authedFetch, deleteSignedInUser, signInWithGoogle, signOutUser, useUser } from "@/lib/firebase/client";
import { parseResume, parseSections } from "@/lib/resume";
import type { ResumeProfile } from "@/lib/resume-builder/model";
import { CATEGORY_INFO, CATEGORY_LABELS, categoriesFor, JOB_TYPE_LABELS, JOB_TYPES, TRACK_LABELS, TRACKS, type Category, type JobType, type Track } from "@/lib/schema/enums";
import { ResumeDownload } from "./ResumeDownload";

interface Prefs {
  tracks: Track[];
  categories: Category[];
  types: JobType[];
  states: string[];
}
interface Details {
  fullName: string;
  phone: string;
  college: string;
  degree: string;
  branch: string;
  gradYear: string;
  city: string;
  linkedin: string;
  github: string;
}
interface Project {
  title: string;
  tools: string;
  points: string;
}
interface Experience {
  role: string;
  org: string;
  period: string;
  points: string;
}
interface Education {
  title: string;
  institution: string;
  year: string;
  score: string;
}
interface ResumeState {
  summary: string;
  projects: Project[];
  experience: Experience[];
  education: Education[];
  certifications: string; // one per line
  achievements: string; // one per line
}
interface Profile {
  details: Details;
  resume: ResumeState;
  skills: string[];
  prefs: Prefs;
  minMatch: number;
  channels: { email: boolean; telegram: boolean };
  telegramConnected: boolean;
  consentAt?: string;
}
type ServerProfile = Partial<Omit<Profile, "details" | "resume">> & { details?: Record<string, unknown>; resume?: Record<string, unknown> };

const EMPTY_DETAILS: Details = { fullName: "", phone: "", college: "", degree: "", branch: "", gradYear: "", city: "", linkedin: "", github: "" };
const EMPTY_RESUME_STATE: ResumeState = { summary: "", projects: [], experience: [], education: [], certifications: "", achievements: "" };
const EMPTY: Profile = {
  details: EMPTY_DETAILS,
  resume: EMPTY_RESUME_STATE,
  skills: [],
  prefs: { tracks: [], categories: [], types: [], states: [] },
  minMatch: 40,
  channels: { email: true, telegram: false },
  telegramConnected: false,
};
const DETAIL_FIELDS: [keyof Details, string, string][] = [
  ["fullName", "Full name", "As on your resume"],
  ["phone", "Phone", "+91 98765 43210"],
  ["college", "College", "Your college name"],
  ["degree", "Degree", "B.Tech / B.E. / Diploma"],
  ["branch", "Branch", "Robotics and Automation"],
  ["gradYear", "Graduation year", "2026"],
  ["city", "City", "Puducherry"],
  ["linkedin", "LinkedIn URL", "https://www.linkedin.com/in/…"],
  ["github", "GitHub URL", "https://github.com/…"],
];
const TEXTAREA = "w-full rounded-md border border-hairline-strong bg-surface p-3 text-[15px]";

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const str = (v: unknown) => (v == null ? "" : String(v));
const linesOf = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

function rows<T>(v: unknown, keys: (keyof T & string)[]): T[] {
  return (Array.isArray(v) ? v : []).map((x: Record<string, unknown>) => Object.fromEntries(keys.map((k) => [k, str(x[k])])) as T);
}

/** Stored profile (server shape) -> form state (all text fields as strings). */
function fromServer(p: ServerProfile): Profile {
  const details = Object.fromEntries(
    (Object.keys(EMPTY_DETAILS) as (keyof Details)[]).map((k) => [k, str(p.details?.[k])]),
  ) as unknown as Details;
  const r = p.resume ?? {};
  const resume: ResumeState = {
    summary: str(r.summary),
    projects: rows<Project>(r.projects, ["title", "tools", "points"]),
    experience: rows<Experience>(r.experience, ["role", "org", "period", "points"]),
    education: rows<Education>(r.education, ["title", "institution", "year", "score"]),
    certifications: (Array.isArray(r.certifications) ? r.certifications : []).join("\n"),
    achievements: (Array.isArray(r.achievements) ? r.achievements : []).join("\n"),
  };
  return { ...EMPTY, ...p, details, resume };
}

function trimAll<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])) as T;
}

/** Form state -> API body (drops empty rows and empty optional fields). */
function resumeForApi(r: ResumeState) {
  const opt = (s: string) => s || undefined;
  return {
    summary: r.summary.trim(),
    projects: r.projects.map(trimAll).filter((x) => x.title && x.points).map((x) => ({ ...x, tools: opt(x.tools) })),
    experience: r.experience.map(trimAll).filter((x) => x.role && x.org && x.points).map((x) => ({ ...x, period: opt(x.period) })),
    education: r.education.map(trimAll).filter((x) => x.title && x.institution).map((x) => ({ ...x, year: opt(x.year), score: opt(x.score) })),
    certifications: linesOf(r.certifications).slice(0, 15),
    achievements: linesOf(r.achievements).slice(0, 15),
  };
}

/** Form state -> resume generator input. */
function toResumeProfile(p: Profile, email: string): ResumeProfile {
  const d = p.details;
  const opt = (s: string) => s.trim() || undefined;
  return {
    email,
    skills: p.skills,
    details: {
      fullName: d.fullName,
      phone: opt(d.phone),
      college: opt(d.college),
      degree: opt(d.degree),
      branch: opt(d.branch),
      gradYear: Number(d.gradYear) || undefined,
      city: opt(d.city),
      linkedin: opt(d.linkedin),
      github: opt(d.github),
    },
    resume: { ...resumeForApi(p.resume), summary: opt(p.resume.summary) },
  };
}

/** Reads a PDF in the browser, keeping line breaks; the file never leaves the device. */
async function pdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : "")).join(""));
  }
  return pages.join("\n");
}

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={on} className={on ? "chip-on" : "chip"}>
      {children}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg font-medium text-ink">{title}</h2>
      {hint && <p className="text-sm">{hint}</p>}
      {children}
    </section>
  );
}

/** Repeating rows (projects, internships, school education) with add / remove. */
function RowsEditor<T extends object>({
  label,
  items,
  empty,
  max,
  fields,
  pointsPlaceholder,
  onChange,
}: {
  label: string;
  items: T[];
  empty: T;
  max: number;
  fields: [keyof T & string, string, string][];
  pointsPlaceholder?: string;
  onChange: (items: T[]) => void;
}) {
  const update = (i: number, key: string, value: string) => onChange(items.map((r, j) => (j === i ? { ...r, [key]: value } : r)));
  const hasPoints = "points" in empty;
  return (
    <div className="space-y-2">
      <p className="label">{label}</p>
      {items.map((row, i) => (
        <div key={i} className="space-y-2 rounded-md border border-hairline p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map(([key, name, example]) => (
              <input
                key={key}
                aria-label={name}
                placeholder={`${name} — e.g. ${example}`}
                value={str((row as Record<string, unknown>)[key])}
                onChange={(e) => update(i, key, e.target.value)}
                className="input h-10 text-[15px]"
              />
            ))}
          </div>
          {hasPoints && (
            <textarea
              aria-label="What you did (one point per line)"
              value={str((row as Record<string, unknown>).points)}
              onChange={(e) => update(i, "points", e.target.value)}
              rows={3}
              placeholder={pointsPlaceholder}
              className={TEXTAREA}
            />
          )}
          <button type="button" className="text-sm text-muted underline" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      {items.length < max && (
        <button type="button" className="btn-outline" onClick={() => onChange([...items, { ...empty }])}>
          + Add
        </button>
      )}
    </div>
  );
}

function ProfileSummary({ p, email, onEdit, onUpload }: { p: Profile; email: string; onEdit: () => void; onUpload: () => void }) {
  const d = p.details;
  const r = resumeForApi(p.resume);
  const filled = [
    r.summary && "summary",
    r.projects.length && `${r.projects.length} projects`,
    r.experience.length && `${r.experience.length} internships/experience`,
    r.certifications.length && `${r.certifications.length} certifications`,
    r.achievements.length && `${r.achievements.length} achievements`,
  ].filter(Boolean);
  const edu = [d.degree, d.branch, d.gradYear && `Class of ${d.gradYear}`].filter(Boolean).join(" · ");
  const wants = [
    p.prefs.tracks.map((t) => TRACK_LABELS[t]).join(", "),
    p.prefs.types.map((t) => JOB_TYPE_LABELS[t]).join(", "),
    p.prefs.categories.map((c) => CATEGORY_LABELS[c]).join(", "),
    p.prefs.states.join(", "),
  ].filter(Boolean);
  const channels = [p.channels.email && "Email", p.channels.telegram && p.telegramConnected && "Telegram"].filter(Boolean).join(" + ") || "Off";
  return (
    <section className="card space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-3xl">{d.fullName}</h2>
          {d.college && <p className="text-ink">{d.college}</p>}
          {edu && <p>{edu}</p>}
          <p className="text-sm text-muted">{[email, d.phone, d.city].filter(Boolean).join(" · ")}</p>
          <div className="mt-1 flex gap-4 text-sm">
            {d.linkedin && <a href={d.linkedin} target="_blank" rel="noopener noreferrer" className="underline">LinkedIn</a>}
            {d.github && <a href={d.github} target="_blank" rel="noopener noreferrer" className="underline">GitHub</a>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="btn-primary">Edit profile</button>
          <button type="button" onClick={onUpload} className="btn-outline">Update from new resume</button>
        </div>
      </div>
      <div>
        <p className="label">Skills ({p.skills.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.skills.map((s) => <span key={s} className="rounded-xs bg-canvas px-2 py-0.5 text-[13px]">{s}</span>)}
        </div>
      </div>
      <p className="text-[15px]">
        <span className="label mr-2">Alerts</span>
        {channels} · jobs matching ≥ {p.minMatch}% of your skills{wants.length ? ` · ${wants.join(" · ")}` : " · all jobs"}
      </p>
      <div className="border-t border-hairline pt-4">
        <p className="label">Your resume</p>
        <p className="mb-3 mt-1 text-sm">
          Made from your profile{filled.length ? ` (${filled.join(", ")})` : ""}.{" "}
          {filled.length < 2 && "Add projects and internships in Edit profile for a stronger resume. "}
          On any job page you can also download one tailored to that job.
        </p>
        <ResumeDownload profile={toResumeProfile(p, email)} />
      </div>
    </section>
  );
}

export function ProfileForm({ skillOptions, jobSkills, states }: { skillOptions: string[]; jobSkills: string[]; states: string[] }) {
  const user = useUser();
  const [p, setP] = useState<Profile>(EMPTY);
  const [saved, setSaved] = useState(false); // a profile exists on the server
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [pasted, setPasted] = useState("");
  const [tgUrl, setTgUrl] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    authedFetch(user, "/api/profile")
      .then((r) => r.json())
      .then((d: { profile: ServerProfile | null }) => {
        if (d.profile) {
          setP(fromServer(d.profile));
          setSaved(true);
          setConsent(true);
        } else {
          setP((prev) => ({ ...prev, details: { ...prev.details, fullName: user.displayName ?? "" } }));
        }
        setLoaded(true);
      })
      .catch(() => setMsg({ ok: false, text: "Could not load your profile. Refresh the page." }));
  }, [user]);

  const set = (patch: Partial<Profile>) => setP((prev) => ({ ...prev, ...patch }));
  const setDetail = (k: keyof Details, v: string) => setP((prev) => ({ ...prev, details: { ...prev.details, [k]: v } }));
  const setResume = (patch: Partial<ResumeState>) => setP((prev) => ({ ...prev, resume: { ...prev.resume, ...patch } }));
  const setPrefs = (patch: Partial<Prefs>) => setP((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } }));
  const addSkills = (found: string[]) => setP((prev) => ({ ...prev, skills: [...new Set([...prev.skills, ...found])].slice(0, 80) }));

  /** Fill the profile from resume text. New profile: fill everything found; saved profile: only empty fields. */
  function applyResume(text: string) {
    const r = parseResume(text, jobSkills);
    const sec = parseSections(text);
    const found = Object.entries(r).filter(([k, v]) => k in EMPTY_DETAILS && v !== undefined && v !== "");
    setP((prev) => {
      const details = { ...prev.details };
      for (const [k, v] of found) {
        const key = k as keyof Details;
        if (!saved || !details[key]) details[key] = String(v);
      }
      const cur = prev.resume;
      const resume: ResumeState = {
        summary: cur.summary || sec.summary || "",
        projects: cur.projects.length ? cur.projects : sec.projects.map((x) => ({ title: x.title, tools: x.tools ?? "", points: x.points })),
        experience: cur.experience.length ? cur.experience : sec.experience.map((x) => ({ role: x.role, org: x.org, period: x.period ?? "", points: x.points })),
        education: cur.education.length ? cur.education : sec.education.map((x) => ({ title: x.title, institution: x.institution, year: x.year ?? "", score: x.score ?? "" })),
        certifications: cur.certifications || sec.certifications.join("\n"),
        achievements: cur.achievements || sec.achievements.join("\n"),
      };
      return { ...prev, details, resume, skills: [...new Set([...prev.skills, ...r.skills])].slice(0, 80) };
    });
    setEditing(true);
    const sections = sec.projects.length + sec.experience.length;
    setMsg(
      r.skills.length || found.length
        ? { ok: true, text: `Read your resume: ${found.length} details, ${r.skills.length} skills${sections ? `, ${sections} projects/internships` : ""}. Check everything below, then save.` }
        : { ok: false, text: "Couldn't read much from this resume. Fill in the details below by hand." },
    );
  }

  async function onResume(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      applyResume(await pdfText(file));
    } catch {
      setMsg({ ok: false, text: "Could not read that PDF. Paste the resume text instead." });
      setEditing(true);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    if (!user) return;
    setBusy(true);
    setMsg(null);
    const res = await authedFetch(user, "/api/profile", {
      method: "PUT",
      body: JSON.stringify({ details: p.details, resume: resumeForApi(p.resume), skills: p.skills, prefs: p.prefs, minMatch: p.minMatch, channels: p.channels, consent }),
    });
    const d = (await res.json()) as { profile?: ServerProfile & { skills?: string[] }; error?: string };
    setBusy(false);
    if (!res.ok || !d.profile) return setMsg({ ok: false, text: d.error ?? "Could not save." });
    setP(fromServer(d.profile));
    setSaved(true);
    setEditing(false);
    try {
      localStorage.setItem("urfuture:skills", JSON.stringify(d.profile.skills ?? [])); // feeds "Match my skills" on the job list
    } catch {
      /* private mode */
    }
    setMsg({ ok: true, text: "Profile saved. Download your resume below. New matching jobs will be sent to you once a day." });
  }

  async function telegram(action: "link" | "check") {
    if (!user) return;
    const res = await authedFetch(user, "/api/telegram", { method: "POST", body: JSON.stringify({ action }) });
    const d = (await res.json()) as { url?: string; connected?: boolean; error?: string };
    if (!res.ok) return setMsg({ ok: false, text: d.error ?? "Telegram error." });
    if (d.url) {
      setTgUrl(d.url);
      window.open(d.url, "_blank", "noopener");
      return;
    }
    if (d.connected) {
      set({ telegramConnected: true, channels: { ...p.channels, telegram: true } });
      setTgUrl("");
      setMsg({ ok: true, text: "Telegram connected." });
    } else {
      setMsg({ ok: false, text: "Not connected yet. In Telegram, press START in the bot chat, then check again." });
    }
  }

  async function deleteAll() {
    if (!user || !confirm("Delete your profile, skills and sign-in account? This cannot be undone.")) return;
    const res = await authedFetch(user, "/api/profile", { method: "DELETE" });
    if (res.ok) {
      await deleteSignedInUser().catch(() => signOutUser());
      setP(EMPTY);
      setSaved(false);
      setMsg({ ok: true, text: "All your data was deleted." });
    }
  }

  if (user === undefined) return <p className="py-10">Loading…</p>;

  if (!user) {
    return (
      <div className="card space-y-4 p-8 text-center">
        <h2 className="display text-3xl">Get jobs that match your resume</h2>
        <p>Sign in, upload your resume (or create one here), and we build your profile, give you a downloadable resume, and message you when a new job fits your skills. Free.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => signInWithGoogle().catch(() => setMsg({ ok: false, text: "Sign-in was cancelled or blocked (allow pop-ups)." }))}
        >
          Sign in with Google
        </button>
        <p className="text-sm text-muted">
          Browsing jobs never needs an account. <Link href="/privacy" className="underline">What we store</Link>
        </p>
        {msg && <p className="text-sm text-error">{msg.text}</p>}
      </div>
    );
  }

  const hiddenFileInput = <input ref={fileInput} type="file" accept="application/pdf" className="sr-only" onChange={(e) => onResume(e.target.files?.[0])} />;
  const status = msg && <p className={`text-sm ${msg.ok ? "text-success" : "text-error"}`}>{msg.text}</p>;
  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p>
        Signed in as <b className="text-ink">{user.email}</b>
      </p>
      <button type="button" onClick={() => signOutUser()} className="btn-outline">Sign out</button>
    </div>
  );
  const telegramBox = (
    <section className="card space-y-3 p-5">
      <h2 className="text-lg font-medium text-ink">Telegram alerts</h2>
      {p.telegramConnected ? (
        <p className="text-[15px]">Connected ✓ — send /stop to the bot anytime to turn it off.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-outline" onClick={() => telegram("link")}>Connect Telegram</button>
          {tgUrl && <button type="button" className="btn-outline" onClick={() => telegram("check")}>I pressed START — check</button>}
        </div>
      )}
      {tgUrl && (
        <p className="text-sm">
          If Telegram didn&apos;t open: <a href={tgUrl} target="_blank" rel="noopener noreferrer" className="underline">open the bot</a> and press START.
        </p>
      )}
    </section>
  );

  if (!loaded) {
    return (
      <div className="space-y-5">
        {header}
        <p>Loading your profile…</p>
      </div>
    );
  }

  // Saved profile, not editing: show it with Edit / Update / Download.
  if (saved && !editing) {
    return (
      <div className="space-y-5">
        {header}
        {hiddenFileInput}
        {status}
        <ProfileSummary p={p} email={user.email ?? ""} onEdit={() => setEditing(true)} onUpload={() => fileInput.current?.click()} />
        {telegramBox}
        <button type="button" onClick={deleteAll} className="btn-outline text-error">Delete my data</button>
      </div>
    );
  }

  // New user: upload a resume, or create one from scratch.
  if (!saved && !editing) {
    return (
      <div className="space-y-5">
        {header}
        {hiddenFileInput}
        <section className="card space-y-4 p-8 text-center">
          <h2 className="display text-3xl">Step 1: your resume</h2>
          <p>Upload your resume and we read your name, college, degree, branch, links, skills and projects from it. You can check and edit everything before saving.</p>
          <p className="text-sm text-muted">Your resume is read on this device only. The file is never uploaded or stored.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? "Reading…" : "Upload resume (PDF)"}
            </button>
            <button type="button" className="btn-outline" onClick={() => setEditing(true)}>No resume yet? Create one</button>
          </div>
          <p className="text-sm">No resume? Enter your details and we make an ATS-friendly resume for you to download as PDF or Word.</p>
          {status}
        </section>
      </div>
    );
  }

  const cats = categoriesFor(p.prefs.tracks.length === 1 ? p.prefs.tracks[0] : undefined);

  // Edit form (new profile, or editing a saved one).
  return (
    <div className="space-y-5">
      {header}
      {hiddenFileInput}
      {status}

      <Section title="Your resume file" hint="Upload again anytime to add new skills. Fields you already filled are never overwritten.">
        <button type="button" className="btn-outline" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? "Reading…" : "Upload resume (PDF)"}
        </button>
        <details>
          <summary className="cursor-pointer text-sm text-ink">Or paste resume text (for Word files)</summary>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} rows={5} className={`mt-2 ${TEXTAREA}`} placeholder="Paste your resume here" />
          <button type="button" className="btn-outline mt-2" onClick={() => applyResume(pasted)}>Read this text</button>
        </details>
      </Section>

      <Section title="Your details" hint={`Email: ${user.email} (from Google)`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {DETAIL_FIELDS.map(([key, label, placeholder]) => (
            <label key={key} className={`flex flex-col gap-1 text-sm ${key === "college" ? "sm:col-span-2" : ""}`}>
              <span className="label">
                {label}
                {key === "fullName" && " *"}
              </span>
              <input
                value={p.details[key]}
                onChange={(e) => setDetail(key, e.target.value)}
                placeholder={placeholder}
                inputMode={key === "gradYear" ? "numeric" : key === "phone" ? "tel" : undefined}
                className="input h-10 text-[15px]"
              />
            </label>
          ))}
        </div>
      </Section>

      <Section title="Your skills" hint="Matched against every new job and shown on your resume. Remove anything wrong, add anything missing.">
        <div className="flex flex-wrap gap-2">
          {p.skills.map((s) => (
            <button key={s} type="button" onClick={() => set({ skills: p.skills.filter((x) => x !== s) })} className="chip-on" title="Remove">
              {s} ✕
            </button>
          ))}
          {!p.skills.length && <p className="text-sm text-muted">No skills yet — upload your resume or add them below.</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (newSkill.trim()) addSkills([newSkill.trim().slice(0, 60)]);
            setNewSkill("");
          }}
        >
          <input list="skill-options" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill (e.g. Siemens TIA Portal)" className="input h-10 text-[15px]" />
          <datalist id="skill-options">{skillOptions.map((s) => <option key={s} value={s} />)}</datalist>
          <button className="btn-outline">Add</button>
        </form>
      </Section>

      <Section title="Resume content" hint="Used to create your resume. Write only what you actually did — one point per line.">
        <label className="flex flex-col gap-1 text-sm">
          <span className="label">Summary (optional — we write one if empty)</span>
          <textarea value={p.resume.summary} onChange={(e) => setResume({ summary: e.target.value })} rows={3} maxLength={700} className={TEXTAREA} placeholder="2-3 lines about you and the role you want" />
        </label>
        <RowsEditor<Project>
          label="Projects"
          items={p.resume.projects}
          empty={{ title: "", tools: "", points: "" }}
          max={8}
          onChange={(projects) => setResume({ projects })}
          fields={[
            ["title", "Project title", "Pick-and-place robot arm"],
            ["tools", "Tools / hardware", "ROS2, ESP32, SolidWorks"],
          ]}
          pointsPlaceholder={"What you did, one point per line, e.g.\nBuilt a 4-DOF arm that sorts parts by colour\nWrote inverse kinematics in Python"}
        />
        <RowsEditor<Experience>
          label="Internships / experience / industrial training"
          items={p.resume.experience}
          empty={{ role: "", org: "", period: "", points: "" }}
          max={6}
          onChange={(experience) => setResume({ experience })}
          fields={[
            ["role", "Role", "Automation intern"],
            ["org", "Company", "ABC Automation Pvt Ltd"],
            ["period", "Dates", "Jun 2025 - Jul 2025"],
          ]}
          pointsPlaceholder={"What you did, one point per line, e.g.\nProgrammed a Siemens S7-1200 PLC for a conveyor line\nDesigned HMI screens in WinCC"}
        />
        <RowsEditor<Education>
          label="Other education (school, diploma)"
          items={p.resume.education}
          empty={{ title: "", institution: "", year: "", score: "" }}
          max={4}
          onChange={(education) => setResume({ education })}
          fields={[
            ["title", "Course", "Higher Secondary (HSC)"],
            ["institution", "School", "ABC Higher Secondary School"],
            ["year", "Year", "2022"],
            ["score", "Score", "92%"],
          ]}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="label">Certifications (one per line)</span>
          <textarea value={p.resume.certifications} onChange={(e) => setResume({ certifications: e.target.value })} rows={3} className={TEXTAREA} placeholder="NPTEL - Industrial Automation and Control" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="label">Achievements & activities (one per line)</span>
          <textarea value={p.resume.achievements} onChange={(e) => setResume({ achievements: e.target.value })} rows={3} className={TEXTAREA} placeholder="2nd place, college robotics competition 2025" />
        </label>
      </Section>

      <Section title="What jobs you want" hint="Leave a group empty to get everything in it.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TRACKS.map((t) => <Chip key={t} on={p.prefs.tracks.includes(t)} onClick={() => setPrefs({ tracks: toggle(p.prefs.tracks, t) })}>{TRACK_LABELS[t]}</Chip>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {JOB_TYPES.map((t) => <Chip key={t} on={p.prefs.types.includes(t)} onClick={() => setPrefs({ types: toggle(p.prefs.types, t) })}>{JOB_TYPE_LABELS[t]}</Chip>)}
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-ink">Categories {p.prefs.categories.length > 0 && `(${p.prefs.categories.length})`}</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {cats.map((c) => (
                <Chip key={c} title={CATEGORY_INFO[c].hint} on={p.prefs.categories.includes(c)} onClick={() => setPrefs({ categories: toggle(p.prefs.categories, c) })}>
                  {CATEGORY_INFO[c].label}
                </Chip>
              ))}
            </div>
          </details>
          {states.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-ink">States {p.prefs.states.length > 0 && `(${p.prefs.states.length})`} — remote jobs always included</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {states.map((s) => <Chip key={s} on={p.prefs.states.includes(s)} onClick={() => setPrefs({ states: toggle(p.prefs.states, s) })}>{s}</Chip>)}
              </div>
            </details>
          )}
          <label className="block text-sm">
            Only alert me when my skills match at least <b className="text-ink">{p.minMatch}%</b> of the job
            <input type="range" min={10} max={90} step={5} value={p.minMatch} onChange={(e) => set({ minMatch: Number(e.target.value) })} className="mt-2 block w-full accent-[var(--color-primary)]" />
          </label>
        </div>
      </Section>

      <Section title="How to reach you" hint="One message a day at most, only when there are new matching jobs.">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={p.channels.email} onChange={(e) => set({ channels: { ...p.channels, email: e.target.checked } })} className="h-4 w-4" />
          Email to {user.email}
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            disabled={!p.telegramConnected}
            checked={p.channels.telegram && p.telegramConnected}
            onChange={(e) => set({ channels: { ...p.channels, telegram: e.target.checked } })}
            className="h-4 w-4"
          />
          Telegram {p.telegramConnected ? "(connected)" : "(connect it after saving)"}
        </label>
      </Section>

      <section className="card space-y-4 p-5">
        <label className="flex items-start gap-3 text-[15px]">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4" />
          <span>
            I agree that my profile details and skills are stored to create my resume and send me job alerts, as explained in the{" "}
            <Link href="/privacy" className="underline">privacy notice</Link>. I can edit or delete them anytime.
          </span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={save} disabled={busy || !consent || !p.skills.length || !p.details.fullName.trim()} className="btn-primary disabled:opacity-50">
            {saved ? "Save changes" : "Create my profile"}
          </button>
          {saved && <button type="button" onClick={() => setEditing(false)} className="btn-outline">Cancel</button>}
        </div>
        {!p.skills.length && <p className="text-sm text-muted">Add at least one skill to save.</p>}
        {status}
      </section>
    </div>
  );
}
