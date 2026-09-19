import { hitRateLimit } from "@/lib/jobs/repo";
import { profileInputSchema, type UserProfile } from "@/lib/schema/user";
import { deleteProfile, getProfile, saveProfile, userFromRequest } from "@/lib/users";

export const dynamic = "force-dynamic";

const unauthorized = () => Response.json({ error: "Please sign in again." }, { status: 401 });

/** Only what the profile page needs; never the Telegram link code. */
function view(p: UserProfile | null) {
  if (!p) return null;
  return { details: p.details, email: p.email, skills: p.skills, prefs: p.prefs, minMatch: p.minMatch, channels: p.channels, telegramConnected: !!p.telegramChatId, consentAt: p.consentAt };
}

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return unauthorized();
  return Response.json({ profile: view(await getProfile(user.uid)) });
}

export async function PUT(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return unauthorized();
  if (!(await hitRateLimit(`profile-${user.uid}`, 20))) return Response.json({ error: "Too many saves, try again in a minute." }, { status: 429 });
  const parsed = profileInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues.map((i) => `${i.path.join(".") || "profile"}: ${i.message}`).join("; ") }, { status: 400 });
  }
  return Response.json({ profile: view(await saveProfile(user, parsed.data)) });
}

export async function DELETE(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return unauthorized();
  await deleteProfile(user.uid);
  return Response.json({ ok: true });
}
