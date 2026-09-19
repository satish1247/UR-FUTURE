import { hitRateLimit } from "@/lib/jobs/repo";
import { registerClient, validRedirectUri } from "@/lib/oauth";

// Dynamic client registration (RFC 7591). Public clients only (PKCE, no secret).
export async function POST(req: Request) {
  if (!(await hitRateLimit("oauth-register", 30))) return Response.json({ error: "slow_down" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { redirect_uris?: unknown; client_name?: unknown };
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (!uris.length || uris.length > 10 || !uris.every(validRedirectUri)) {
    return Response.json({ error: "invalid_redirect_uri", error_description: "redirect_uris must be https or loopback URLs" }, { status: 400 });
  }
  const client = await registerClient(typeof body.client_name === "string" ? body.client_name : "MCP client", uris);
  return Response.json(
    {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: client.name,
      redirect_uris: client.redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201 },
  );
}
