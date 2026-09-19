"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authedFetch, signInWithGoogle, signOutUser, useUser } from "@/lib/firebase/client";
import { parseResume } from "@/lib/resume";
import { CATEGORY_INFO, CATEGORY_LABELS, categoriesFor, JOB_TYPE_LABELS, JOB_TYPES, TRACK_LABELS, TRACKS, type Category, type JobType, type Track } from "@/lib/schema/enums";

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
interface Profile {
  details: Details;
  skills: string[];
  prefs: Prefs;
  minMatch: number;
  channels: { email: boolean; telegram: boolean };
  telegramConnected: boolean;
  consentAt?: string;
}
type ServerProfile = Partial<Omit<Profile, "details">> & { details?: Record<string, unknown> };

const EMPTY_DETAILS: Details = { fullName: "", phone: "", college: "", degree: "", branch: "", gradYear: "", city: "", linkedin: "", github: "" };
const EMPTY: Profile = {
  details: EMPTY_DETAILS,
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

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Stored profile (server shape) -> form state (all detail fields as strings). */
function fromServer(p: ServerProfile): Profile {
  const details = Object.fromEntries(
    (Object.keys(EMPTY_DETAILS) as (keyof Details)[]).map((k) => [k, p.details?.[k] == null ? "" : String(p.details[k])]),
  ) as unknown as Details;
  return { ...EMPTY, ...p, details };
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

function ProfileSummary({ p, email, onEdit, onUpload }: { p: Profile; email: string; onEdit: () => void; onUpload: () => void }) {
  const d = p.details;
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
  const setPrefs = (patch: Partial<Prefs>) => setP((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } }));
  const addSkills = (found: string[]) => setP((prev) => ({ ...prev, skills: [...new Set([...prev.skills, ...found])].slice(0, 80) }));

  /** Fill details from the resume. New profile: fill everything found; saved profile: only empty fields. */
  function applyResume(text: string) {
    const r = parseResume(text, jobSkills);
    const found = Object.entries(r).filter(([k, v]) => k in EMPTY_DETAILS && v !== undefined && v !== "");
    setP((prev) => {
      const details = { ...prev.details };
      for (const [k, v] of found) {
        const key = k as keyof Details;
        if (!saved || !details[key]) details[key] = String(v);
      }
      return { ...prev, details, skills: [...new Set([...prev.skills, ...r.skills])].slice(0, 80) };
    });
    setEditing(true);
    setMsg(
      r.skills.length || found.length
        ? { ok: true, text: `Read your resume: ${found.length} details and ${r.skills.length} skills. Check everything below, then save.` }
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
      body: JSON.stringify({ details: p.details, skills: p.skills, prefs: p.prefs, minMatch: p.minMatch, channels: p.channels, consent }),
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
    setMsg({ ok: true, text: "Profile saved. New matching jobs will be sent to you once a day." });
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
      await signOutUser();
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
        <p>Sign in, upload your resume, and we build your profile and message you when a new job fits your skills — by email or Telegram, once a day. Free.</p>
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

  // Saved profile, not editing: show it with Edit / Update buttons.
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

  // New user who hasn't uploaded yet: start with the resume.
  if (!saved && !editing) {
    return (
      <div className="space-y-5">
        {header}
        {hiddenFileInput}
        <section className="card space-y-4 p-8 text-center">
          <h2 className="display text-3xl">Step 1: upload your resume</h2>
          <p>We read your name, college, degree, branch, links and skills from it and build your profile. You can check and edit everything before saving.</p>
          <p className="text-sm text-muted">Your resume is read on this device only. The file is never uploaded or stored.</p>
          <button type="button" className="btn-primary" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? "Reading…" : "Upload resume (PDF)"}
          </button>
          <div className="text-sm">
            <button type="button" className="underline" onClick={() => setEditing(true)}>No PDF? Fill in by hand</button>
          </div>
          {status}
        </section>
      </div>
    );
  }

  const cats = categoriesFor(p.prefs.tracks.length === 1 ? p.prefs.tracks[0] : undefined);

  // Edit form (new profile after reading the resume, or editing a saved one).
  return (
    <div className="space-y-5">
      {header}
      {hiddenFileInput}
      {status}

      <Section title="Your resume" hint="Upload again anytime to add new skills. Fields you already filled are never overwritten.">
        <button type="button" className="btn-outline" disabled={busy} onClick={() => fileInput.current?.click()}>
          {busy ? "Reading…" : "Upload resume (PDF)"}
        </button>
        <details>
          <summary className="cursor-pointer text-sm text-ink">Or paste resume text (for Word files)</summary>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            className="mt-2 w-full rounded-md border border-hairline-strong bg-surface p-3 text-[15px]"
            placeholder="Paste your resume here"
          />
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

      <Section title="Your skills" hint="These are matched against every new job. Remove anything wrong, add anything missing.">
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
            I agree that my profile details and skills are stored to send me job alerts, as explained in the{" "}
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
