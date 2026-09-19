import { hitRateLimit } from "@/lib/jobs/repo";
import { pollTelegram } from "@/lib/notify";
import { getProfile, newTelegramLinkCode, userFromRequest } from "@/lib/users";

export const dynamic = "force-dynamic";

// POST {action:"link"} -> deep link to the bot with a one-time code.
// POST {action:"check"} -> reads the bot's new messages and reports whether this student is connected.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  if (!(await hitRateLimit(`telegram-${user.uid}`, 10))) return Response.json({ error: "Too many tries, wait a minute." }, { status: 429 });
  const profile = await getProfile(user.uid);
  if (!profile) return Response.json({ error: "Save your profile first." }, { status: 400 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  if (action === "link") {
    if (!bot) return Response.json({ error: "Telegram is not set up on this site." }, { status: 503 });
    const code = await newTelegramLinkCode(user.uid);
    return Response.json({ url: `https://t.me/${bot}?start=${code}` });
  }
  await pollTelegram();
  return Response.json({ connected: !!(await getProfile(user.uid))?.telegramChatId });
}
