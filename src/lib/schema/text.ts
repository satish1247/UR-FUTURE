import { z } from "zod";

// Tags, comments or named entities. Plain "R&D" or "a < b" is allowed.
const HTML_PATTERN = /<\/?[a-z][^>]*>|<!--|&[a-z]{2,8};/i;

export function hasHtml(value: string): boolean {
  return HTML_PATTERN.test(value);
}

export function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function plainText(maxChars: number) {
  return z
    .string()
    .trim()
    .min(1, "must not be empty")
    .max(maxChars, `must be at most ${maxChars} characters`)
    .refine((v) => !hasHtml(v), "must be plain text (remove HTML tags/entities)");
}

export function wordLimited(minWords: number, maxWords: number, maxChars = maxWords * 12) {
  return plainText(maxChars).refine((v) => {
    const n = wordCount(v);
    return n >= minWords && n <= maxWords;
  }, `must be ${minWords}-${maxWords} words`);
}

export function httpsUrl() {
  return z
    .string()
    .trim()
    .max(2048, "URL is too long")
    .refine((v) => {
      try {
        return new URL(v).protocol === "https:";
      } catch {
        return false;
      }
    }, "must be a valid https:// URL");
}

export function list<T extends z.ZodTypeAny>(item: T, min: number, max: number) {
  return z
    .array(item)
    .min(min, `needs at least ${min} item(s)`)
    .max(max, `allows at most ${max} item(s)`);
}

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-09-18");

export const isoDateTime = z.string().datetime({ message: "must be an ISO date-time" });
