"use client";

import { useState } from "react";

const TABS = [
  { key: "create", label: "Build a new ATS resume" },
  { key: "upgrade", label: "Find red flags & upgrade my resume" },
] as const;

// Prefilled links are best-effort: long prompts may be cut off, so Copy is the main action.
const OPEN_IN = [
  { name: "ChatGPT", url: (p: string) => `https://chatgpt.com/?q=${encodeURIComponent(p)}` },
  { name: "Claude", url: (p: string) => `https://claude.ai/new?q=${encodeURIComponent(p)}` },
];

export function ResumePrompts({ create, upgrade }: { create: string; upgrade: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("create");
  const [copied, setCopied] = useState(false);
  const prompt = tab === "create" ? create : upgrade;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed — select the text and copy it manually.");
    }
  };

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="btn-outline">ATS resume prompt</button>;
  }
  return (
    <div className="card p-5">
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={tab === t.key ? "chip-on" : "chip"}>
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm">Paste this into any AI chat. It checks ATS rules, never invents anything, and marks what you must fill as [TO FILL].</p>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-canvas p-4 font-sans text-sm text-ink">{prompt}</pre>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="btn-primary">{copied ? "Copied ✓" : "Copy prompt"}</button>
        {OPEN_IN.map((o) => (
          <a key={o.name} href={o.url(prompt)} target="_blank" rel="noopener noreferrer" className="text-[15px] font-medium text-ink underline underline-offset-4">
            Open in {o.name}
          </a>
        ))}
      </div>
    </div>
  );
}
