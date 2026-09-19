import { exchangeCode, refreshTokens } from "@/lib/oauth";

const error = (code: string, status = 400) => Response.json({ error: code }, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  const form = type.includes("application/json")
    ? new URLSearchParams((await req.json().catch(() => ({}))) as Record<string, string>)
    : new URLSearchParams(await req.text());
  const get = (k: string) => form.get(k) ?? "";
  const clientId = get("client_id");
  if (!clientId) return error("invalid_client", 401);
  const grant = get("grant_type");
  if (grant !== "authorization_code" && grant !== "refresh_token") return error("unsupported_grant_type");
  const result =
    grant === "authorization_code"
      ? await exchangeCode({ code: get("code"), clientId, redirectUri: get("redirect_uri"), codeVerifier: get("code_verifier") })
      : await refreshTokens({ refreshToken: get("refresh_token"), clientId });
  if (!result.ok) return error(result.error);
  return Response.json(result.tokens, { headers: { "cache-control": "no-store" } });
}
