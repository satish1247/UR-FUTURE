import { SITE_NAME } from "@/config/site";
import { getProfile, updateProfile, verifyUnsubscribe } from "@/lib/users";

export const dynamic = "force-dynamic";

const page = (body: string) =>
  new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribe · ${SITE_NAME}</title><body style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;padding:0 16px;color:#0c0a09">${body}</body>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

function params(req: Request) {
  const url = new URL(req.url);
  return { uid: url.searchParams.get("u") ?? "", token: url.searchParams.get("t") ?? "" };
}

// GET shows a button (mail scanners open links, so GET must not unsubscribe by itself).
export async function GET(req: Request) {
  const { uid, token } = params(req);
  if (!uid || !verifyUnsubscribe(uid, token)) return page("<p>This unsubscribe link is not valid.</p>");
  return page(`<h2>Stop job alert emails?</h2><form method="post"><button style="padding:10px 20px;border-radius:999px;border:0;background:#292524;color:#fff;font-size:15px">Unsubscribe</button></form><p style="color:#777169">You can turn them back on anytime from your profile.</p>`);
}

// POST: the button above, and one-click unsubscribe from mail apps (List-Unsubscribe-Post).
export async function POST(req: Request) {
  const { uid, token } = params(req);
  if (!uid || !verifyUnsubscribe(uid, token)) return page("<p>This unsubscribe link is not valid.</p>");
  const profile = await getProfile(uid);
  if (profile) await updateProfile(uid, { channels: { ...profile.channels, email: false } });
  return page(`<h2>Done — no more alert emails.</h2><p>You can turn them back on anytime from your profile on ${SITE_NAME}.</p>`);
}
