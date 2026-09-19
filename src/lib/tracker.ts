"use client";

// Per-device application tracker. No login: everything lives in this browser's localStorage.
import { useSyncExternalStore } from "react";

export const TRACK_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type TrackStatus = (typeof TRACK_STATUSES)[number];
export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Not selected",
};

export interface TrackedJob {
  id: string;
  title: string;
  company: string;
  deadline?: string;
  status: TrackStatus;
  savedAt: string;
  appliedAt?: string;
  notes: string;
  /** Learning-path items ticked off, as "skill#stepIndex". */
  done: string[];
  totalSteps: number;
}
export type JobRef = Pick<TrackedJob, "id" | "title" | "company" | "deadline" | "totalSteps">;
type Store = Record<string, TrackedJob>;

const KEY = "urfuture:tracker";
const EVENT = "urfuture:tracker";
const EMPTY: Store = {};
let cache: { raw: string | null; store: Store } = { raw: null, store: EMPTY };

function read(): Store {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.store; // stable snapshot for useSyncExternalStore
  let store = EMPTY;
  try {
    store = raw ? (JSON.parse(raw) as Store) : EMPTY;
  } catch {
    // corrupted value: start fresh rather than crash the page
  }
  cache = { raw, store };
  return store;
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    alert("Could not save on this device (private browsing or storage full).");
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useTracker(): Store {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

const now = () => new Date().toISOString();

function upsert(ref: JobRef, patch: Partial<TrackedJob>): void {
  const store = read();
  const prev = store[ref.id];
  const base: TrackedJob = prev ?? { ...ref, status: "saved", savedAt: now(), notes: "", done: [] };
  write({ ...store, [ref.id]: { ...base, ...ref, ...patch } });
}

export function setStatus(ref: JobRef, status: TrackStatus): void {
  const prev = read()[ref.id];
  const appliedAt = status !== "saved" ? prev?.appliedAt ?? now() : prev?.appliedAt;
  upsert(ref, { status, appliedAt });
}

/** Apply click: start tracking as "applied" unless the student already moved it further. */
export function markApplied(ref: JobRef): void {
  const prev = read()[ref.id];
  if (!prev || prev.status === "saved") setStatus(ref, "applied");
}

export function toggleStep(ref: JobRef, stepKey: string): void {
  const done = read()[ref.id]?.done ?? [];
  upsert(ref, { done: done.includes(stepKey) ? done.filter((d) => d !== stepKey) : [...done, stepKey] });
}

export function setNotes(id: string, notes: string): void {
  const store = read();
  if (store[id]) write({ ...store, [id]: { ...store[id], notes: notes.slice(0, 1000) } });
}

export function untrack(id: string): void {
  const rest = { ...read() };
  delete rest[id];
  write(rest);
}

export const progress = (t: Pick<TrackedJob, "done" | "totalSteps">) =>
  t.totalSteps ? Math.round((100 * Math.min(t.done.length, t.totalSteps)) / t.totalSteps) : 0;
