import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { SITE_NAME } from "@/config/site";
import { renderEmail, renderTelegram, selectDigestJobs } from "@/lib/digest";
import { db } from "@/lib/firebase/admin";
import type { Job } from "@/lib/schema/job";
import { findByTelegramChat, findByTelegramCode, listAlertUsers, unsubscribeToken, updateProfile } from "@/lib/users";

const EMAILS_PER_DAY = 290; // Brevo free plan: 300/day
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function sendEmail(
  to: { email: string; name: string },
  mail: { subject: string; html: string; text: string },
  unsubscribeUrl: string,
): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.BREVO_SENDER_EMAIL;
  if (!key || !from) return false;
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: process.env.BREVO_SENDER_NAME ?? SITE_NAME },
      to: [to],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("brevo send failed", res.status);
  return res.ok;
}

/** Returns "ok", or "blocked" when the student blocked the bot (so we switch Telegram off). */
export async function sendTelegram(chatId: number, html: string): Promise<"ok" | "blocked" | "error"> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return "error";
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return "ok";
  return res.status === 403 ? "blocked" : "error";
}

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
}

/**
 * Reads new messages sent to the bot (no webhook needed) and links chats that sent
 * "/start <code>" to the matching student. "/stop" unlinks. Safe to call any time.
 */
export async function pollTelegram(): Promise<number> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return 0;
  const stateRef = db().doc("system/telegram");
  const offset = ((await stateRef.get()).data()?.offset as number | undefined) ?? 0;
  const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=0`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return 0;
  const { result } = (await res.json()) as { result: TelegramUpdate[] };
  let linked = 0;
  for (const u of result) {
    const chatId = u.message?.chat.id;
    const text = u.message?.text?.trim() ?? "";
    if (!chatId) continue;
    const start = text.match(/^\/start\s+([a-f0-9]{24})$/);
    if (start) {
      const user = await findByTelegramCode(start[1]);
      if (user) {
        await updateProfile(user.uid, {
          telegramChatId: chatId,
          telegramLinkCode: FieldValue.delete() as unknown as string,
          channels: { email: user.channels?.email ?? false, telegram: true },
        });
        await sendTelegram(chatId, `✅ Connected! New jobs matching your skills will arrive here. Manage alerts: ${siteUrl()}/profile`);
        linked++;
      } else {
        await sendTelegram(chatId, `This link has expired. Open ${siteUrl()}/profile and tap "Connect Telegram" again.`);
      }
    } else if (text === "/stop") {
      const user = await findByTelegramChat(chatId);
      if (user) {
        await updateProfile(user.uid, {
          telegramChatId: FieldValue.delete() as unknown as number,
          channels: { email: user.channels?.email ?? false, telegram: false },
        });
      }
      await sendTelegram(chatId, "Telegram alerts are off. You can turn them on again from the website.");
    } else if (text.startsWith("/start")) {
      await sendTelegram(chatId, `Hi! To get job alerts, sign in at ${siteUrl()}/profile and tap "Connect Telegram".`);
    }
  }
  if (result.length) await stateRef.set({ offset: result[result.length - 1].update_id + 1 });
  return linked;
}

/** Sends each student one message with the new jobs that match them. */
export async function runDigest(jobs: Job[], now = new Date()): Promise<{ users: number; emails: number; telegrams: number }> {
  await pollTelegram();
  const users = await listAlertUsers();
  const today = now.toISOString().slice(0, 10);
  const stamp = now.toISOString();
  let emails = 0;
  let telegrams = 0;
  // Sequential sends: fine for a few hundred students within the cron limit. Batch if it grows.
  for (const user of users) {
    const items = selectDigestJobs(jobs, user, today);
    if (!items.length) continue;
    let sent = false;
    if (user.channels.email && emails < EMAILS_PER_DAY) {
      const unsub = `${siteUrl()}/api/unsubscribe?u=${user.uid}&t=${unsubscribeToken(user.uid)}`;
      const mail = renderEmail({ name: user.name, items, siteUrl: siteUrl(), siteName: SITE_NAME, unsubscribeUrl: unsub });
      if (await sendEmail({ email: user.email, name: user.name }, mail, unsub)) {
        emails++;
        sent = true;
      }
    }
    if (user.channels.telegram && user.telegramChatId) {
      const r = await sendTelegram(user.telegramChatId, renderTelegram(items, siteUrl(), SITE_NAME));
      if (r === "ok") {
        telegrams++;
        sent = true;
      } else if (r === "blocked") {
        await updateProfile(user.uid, { channels: { ...user.channels, telegram: false } });
      }
    }
    // Move the window forward only when something was delivered, so a capped email retries tomorrow.
    if (sent) await updateProfile(user.uid, { lastDigestAt: stamp });
  }
  return { users: users.length, emails, telegrams };
}
