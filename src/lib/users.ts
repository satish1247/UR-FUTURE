import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { adminAuth, db } from "@/lib/firebase/admin";
import type { ProfileInput, UserProfile } from "@/lib/schema/user";

const USERS = "users";

/** Verifies the Firebase ID token from `Authorization: Bearer <token>`. */
export async function userFromRequest(req: Request): Promise<{ uid: string; email: string; name: string } | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const t = await adminAuth().verifyIdToken(token);
    if (!t.email || !t.email_verified) return null;
    return { uid: t.uid, email: t.email, name: (t.name as string | undefined) ?? t.email.split("@")[0] };
  } catch {
    return null;
  }
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const doc = await db().collection(USERS).doc(uid).get();
  return doc.exists ? (doc.data() as UserProfile) : null;
}

export async function saveProfile(user: { uid: string; email: string; name: string }, input: ProfileInput): Promise<UserProfile> {
  const ref = db().collection(USERS).doc(user.uid);
  const now = new Date().toISOString();
  const prev = (await ref.get()).data() as UserProfile | undefined;
  const { details, resume, skills, prefs, minMatch, channels } = input;
  const rest = { details, resume, skills, prefs, minMatch, channels };
  const profile: UserProfile = {
    ...prev,
    ...rest,
    // Telegram can only be on once the bot is actually connected.
    channels: { email: rest.channels.email, telegram: rest.channels.telegram && !!prev?.telegramChatId },
    uid: user.uid,
    email: user.email,
    name: details.fullName || user.name,
    consentAt: prev?.consentAt ?? now,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    // First digest only includes jobs posted after sign-up, so nobody gets a flood of old jobs.
    lastDigestAt: prev?.lastDigestAt ?? now,
  };
  await ref.set(profile);
  return profile;
}

/** "Delete my data": removes the profile and the sign-in account. */
export async function deleteProfile(uid: string): Promise<void> {
  await db().collection(USERS).doc(uid).delete();
  await adminAuth().deleteUser(uid).catch(() => undefined);
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  await db().collection(USERS).doc(uid).set(patch, { merge: true });
}

export async function listAlertUsers(): Promise<UserProfile[]> {
  const snap = await db().collection(USERS).get();
  return snap.docs.map((d) => d.data() as UserProfile).filter((u) => u.channels?.email || u.channels?.telegram);
}

export async function newTelegramLinkCode(uid: string): Promise<string> {
  const code = randomBytes(12).toString("hex");
  await updateProfile(uid, { telegramLinkCode: code });
  return code;
}

export async function findByTelegramCode(code: string): Promise<UserProfile | null> {
  const snap = await db().collection(USERS).where("telegramLinkCode", "==", code).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as UserProfile);
}

export async function findByTelegramChat(chatId: number): Promise<UserProfile | null> {
  const snap = await db().collection(USERS).where("telegramChatId", "==", chatId).limit(1).get();
  return snap.empty ? null : (snap.docs[0].data() as UserProfile);
}

// Signed unsubscribe links, so an email link can switch alerts off without signing in.
const secret = () => {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("CRON_SECRET is not set");
  return s;
};
export const unsubscribeToken = (uid: string) => createHmac("sha256", secret()).update(`unsub:${uid}`).digest("hex").slice(0, 32);
export function verifyUnsubscribe(uid: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(uid));
  const got = Buffer.from(token);
  return got.length === want.length && timingSafeEqual(got, want);
}
