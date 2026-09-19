"use client";

import { useState } from "react";
import { buildResume, pickVariant, type ResumeJob, type ResumeProfile } from "@/lib/resume-builder/model";

const COUNT_KEY = "urfuture:resume-downloads";

function nextCount(): number {
  try {
    const n = Number(localStorage.getItem(COUNT_KEY) ?? "0") || 0;
    localStorage.setItem(COUNT_KEY, String(n + 1));
    return n;
  } catch {
    return Math.floor(Math.random() * 100);
  }
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Download buttons: every click produces the resume in a different design. */
export function ResumeDownload({ profile, job }: { profile: ResumeProfile; job?: ResumeJob }) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
  const [last, setLast] = useState("");

  async function download(format: "pdf" | "docx") {
    setBusy(format);
    try {
      const variant = pickVariant(profile.email, nextCount());
      const data = buildResume(profile, job);
      const blob =
        format === "pdf"
          ? await (await import("@/lib/resume-builder/pdf")).renderPdf(data, variant)
          : await (await import("@/lib/resume-builder/docx")).renderDocx(data, variant);
      const who = profile.details.fullName.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "Resume";
      const forJob = job ? `_${job.company.replace(/\(.*?\)/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}` : "";
      save(blob, `${who}_Resume${forJob}_${variant.name}.${format}`);
      setLast(variant.name);
    } catch {
      setLast("error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" disabled={!!busy} onClick={() => download("pdf")}>
          {busy === "pdf" ? "Creating…" : job ? "Download resume for this job (PDF)" : "Download resume (PDF)"}
        </button>
        <button type="button" className="btn-outline" disabled={!!busy} onClick={() => download("docx")}>
          {busy === "docx" ? "Creating…" : "Word (.docx)"}
        </button>
      </div>
      <p className="text-sm text-muted">
        {last === "error"
          ? "Could not create the file. Please try again."
          : last
            ? `Downloaded the “${last}” design. Click again for a different design.`
            : "Every download uses a different design. All designs are single-column and ATS-friendly."}
      </p>
    </div>
  );
}
