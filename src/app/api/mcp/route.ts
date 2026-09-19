import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { hitRateLimit } from "@/lib/jobs/repo";
import { buildMcpServer } from "@/lib/mcp/server";
import { validAccessToken } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_REQUESTS_PER_MINUTE = 120;

function secretMatches(token: string): boolean {
  const secret = process.env.MCP_SECRET;
  if (!secret || secret.length < 32) return false; // endpoint stays closed until configured
  const given = Buffer.from(token);
  const want = Buffer.from(secret);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** The owner secret (local Claude, scripts) or an OAuth access token (claude.ai connector). */
async function authorized(req: Request): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return secretMatches(token) || (token.length > 0 && (await validAccessToken(token)));
}

const jsonError = (status: number, message: string, headers?: HeadersInit) =>
  Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status, headers });

async function handle(req: Request): Promise<Response> {
  if (!(await authorized(req))) {
    // Tells OAuth clients (claude.ai) where to find the sign-in details.
    const meta = `${new URL(req.url).origin}/.well-known/oauth-protected-resource`;
    return jsonError(401, "Unauthorized", { "www-authenticate": `Bearer resource_metadata="${meta}"` });
  }
  if (!(await hitRateLimit("mcp", MAX_REQUESTS_PER_MINUTE))) return jsonError(429, "Rate limit: max 120 requests/minute");

  let body: unknown;
  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return jsonError(413, "Request too large (max 256 KB)");
    try {
      body = JSON.parse(text);
    } catch {
      return jsonError(400, "Body must be JSON");
    }
  }

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = buildMcpServer();
  await server.connect(transport);
  try {
    return await transport.handleRequest(req, { parsedBody: body });
  } catch (err) {
    console.error("mcp error", err instanceof Error ? err.message : "unknown");
    return jsonError(500, "Internal error");
  }
}

export { handle as GET, handle as POST, handle as DELETE };
