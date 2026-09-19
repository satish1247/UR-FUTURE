import { z } from "zod";
import { CATEGORIES, JOB_TYPES, TRACKS } from "./enums";
import { httpsUrl, list, plainText } from "./text";

// Empty form fields arrive as ""; treat them as not given.
const optional = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" || v === null ? undefined : v), s.optional());

/** Profile details read from the resume, then checked and edited by the student. */
export const detailsSchema = z.object({
  fullName: plainText(80),
  phone: optional(z.string().trim().regex(/^\+?[\d\s-]{10,16}$/,"must be a valid phone number")),
  college: optional(plainText(160)),
  degree: optional(plainText(40)),
  branch: optional(plainText(80)),
  gradYear: optional(z.coerce.number().int().min(2000).max(2040)),
  city: optional(plainText(60)),
  linkedin: optional(httpsUrl()),
  github: optional(httpsUrl()),
});
export type ProfileDetails = z.infer<typeof detailsSchema>;

/** What a signed-in student saves from /profile. The resume file/text is never sent — only these fields. */
export const profileInputSchema = z.object({
  details: detailsSchema,
  skills: list(plainText(60), 1, 80),
  prefs: z.object({
    tracks: list(z.enum(TRACKS), 0, 3).default([]),
    categories: list(z.enum(CATEGORIES), 0, 20).default([]),
    types: list(z.enum(JOB_TYPES), 0, 4).default([]),
    states: list(plainText(60), 0, 20).default([]),
  }),
  minMatch: z.number().int().min(10).max(100).default(40),
  channels: z.object({ email: z.boolean(), telegram: z.boolean() }),
  consent: z.literal(true, { message: "Please accept the privacy notice to turn on alerts" }),
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

/** Stored in `users/{uid}`. */
export interface UserProfile extends Omit<ProfileInput, "consent"> {
  uid: string;
  email: string;
  name: string;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  lastDigestAt?: string;
  telegramChatId?: number;
  telegramLinkCode?: string;
}
