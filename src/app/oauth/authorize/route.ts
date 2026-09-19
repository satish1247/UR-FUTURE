import { SITE_NAME } from "@/config/site";
import { hitRateLimit } from "@/lib/jobs/repo";
import { createCode, getClient, ownerSecretMatches, redirectAllowed } from "@/lib/oauth";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><meta name="viewport" content="width=device-width"><title>Connect · ${SITE_NAME}</title><body style="font-family:Arial,sans-serif;max-width:460px;margin:60px auto;padding:0 16px;color:#0c0a09">${body}</body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "x-frame-options": "DENY", "content-security-policy": "frame-ancestors 'none'" } },
  );

async function checkRequest(p: URLSearchParams) {
  const client = await getClient(p.get("client_id") ?? "");
  const redirectUri = p.get("redirect_uri") ?? "";
  if (!client || !redirectAllowed(client, redirectUri)) return { ok: false, error: "Unknown app or redirect address." } as const;
  if (p.get("response_type") !== "code" || p.get("code_challenge_method") !== "S256" || !p.get("code_challenge")) {
    return { ok: false, error: "This connection request is missing PKCE (S256)." } as const;
  }
  return { ok: true, client, redirectUri } as const;
}

// Shows the approval form. Only the site owner (who knows MCP_SECRET) can approve.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const check = await checkRequest(p);
  if (!check.ok) return page(`<p>${esc(check.error)}</p>`, 400);
  const hidden = ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope", "resource"]
    .map((k) => `<input type="hidden" name="${k}" value="${esc(p.get(k) ?? "")}">`)
    .join("");
  return page(`<h2>Connect ${esc(check.client.name)} to ${SITE_NAME}?</h2>
<p>It will be able to add, update and expire jobs on the site. After approving you return to <b>${esc(new URL(check.redirectUri).host)}</b>.</p>
<form method="post">${hidden}
<label>Owner secret (MCP_SECRET)<br><input name="secret" type="password" required autocomplete="off" style="width:100%;padding:10px;margin:8px 0 16px;font-size:15px"></label>
<button style="padding:10px 20px;border-radius:999px;border:0;background:#292524;color:#fff;font-size:15px">Approve</button></form>`);
}

export async function POST(req: Request) {
  const p = new URLSearchParams(await req.text());
  const check = await checkRequest(p);
  if (!check.ok) return page(`<p>${esc(check.error)}</p>`, 400);
  if (!(await hitRateLimit("oauth-approve", 10)) || !ownerSecretMatches(p.get("secret") ?? "")) {
    return page(`<p>Wrong secret, or too many tries (wait a minute). Go back and try again.</p>`, 401);
  }
  const code = await createCode({ clientId: check.client.clientId, redirectUri: check.redirectUri, codeChallenge: p.get("code_challenge") ?? "" });
  const back = new URL(check.redirectUri);
  back.searchParams.set("code", code);
  const state = p.get("state");
  if (state) back.searchParams.set("state", state);
  return Response.redirect(back.toString(), 302);
}
