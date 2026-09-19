// The claude.ai connector flow end to end. Runs on the emulator: npm run test:emu
import { createHash, randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { GET as protectedResource } from "@/app/.well-known/oauth-protected-resource/[[...path]]/route";
import { POST as mcp } from "@/app/api/mcp/route";
import { GET as authorizeGet, POST as authorizePost } from "@/app/oauth/authorize/route";
import { POST as register } from "@/app/oauth/register/route";
import { POST as token } from "@/app/oauth/token/route";

const SECRET = "s".repeat(40);
const ORIGIN = "https://ur-future.test";
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

const form = (data: Record<string, string>) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString() });
const mcpInit = (auth: string) =>
  mcp(
    new Request(`${ORIGIN}/api/mcp`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth}`, "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }),
    }),
  );

describe("OAuth for the claude.ai connector", () => {
  beforeAll(() => {
    process.env.MCP_SECRET = SECRET;
    expect(process.env.FIRESTORE_EMULATOR_HOST, "run via npm run test:emu").toBeTruthy();
  });

  it("points unauthenticated clients at the discovery document", async () => {
    const res = await mcpInit("nope");
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(`${ORIGIN}/.well-known/oauth-protected-resource`);
    const meta = await (await protectedResource(new Request(`${ORIGIN}/.well-known/oauth-protected-resource`))).json();
    expect(meta).toMatchObject({ resource: `${ORIGIN}/api/mcp`, authorization_servers: [ORIGIN] });
  });

  it("registers, approves with the owner secret, issues tokens, and refreshes them", async () => {
    const reg = await (await register(new Request(`${ORIGIN}/oauth/register`, { method: "POST", body: JSON.stringify({ client_name: "Claude", redirect_uris: [REDIRECT] }) }))).json();
    expect(reg.client_id).toBeTruthy();

    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const params = { client_id: reg.client_id, redirect_uri: REDIRECT, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", state: "xyz" };

    const page = await authorizeGet(new Request(`${ORIGIN}/oauth/authorize?${new URLSearchParams(params)}`));
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("Owner secret");

    const wrong = await authorizePost(new Request(`${ORIGIN}/oauth/authorize`, form({ ...params, secret: "wrong" })));
    expect(wrong.status).toBe(401);

    const ok = await authorizePost(new Request(`${ORIGIN}/oauth/authorize`, form({ ...params, secret: SECRET })));
    expect(ok.status).toBe(302);
    const back = new URL(ok.headers.get("location")!);
    expect(back.origin + back.pathname).toBe(REDIRECT);
    expect(back.searchParams.get("state")).toBe("xyz");
    const code = back.searchParams.get("code")!;

    const bad = await token(new Request(`${ORIGIN}/oauth/token`, form({ grant_type: "authorization_code", code, client_id: reg.client_id, redirect_uri: REDIRECT, code_verifier: "wrong-verifier" })));
    expect(bad.status).toBe(400); // wrong PKCE verifier, and the code is now used up

    const ok2 = await authorizePost(new Request(`${ORIGIN}/oauth/authorize`, form({ ...params, secret: SECRET })));
    const code2 = new URL(ok2.headers.get("location")!).searchParams.get("code")!;
    const tokens = await (await token(new Request(`${ORIGIN}/oauth/token`, form({ grant_type: "authorization_code", code: code2, client_id: reg.client_id, redirect_uri: REDIRECT, code_verifier: verifier })))).json();
    expect(tokens.token_type).toBe("Bearer");

    expect((await mcpInit(tokens.access_token)).status).toBe(200);

    const refreshed = await (await token(new Request(`${ORIGIN}/oauth/token`, form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: reg.client_id })))).json();
    expect(refreshed.access_token).toBeTruthy();
    const reused = await token(new Request(`${ORIGIN}/oauth/token`, form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: reg.client_id })));
    expect(reused.status).toBe(400); // refresh tokens rotate
  });

  it("rejects non-https redirect addresses", async () => {
    const res = await register(new Request(`${ORIGIN}/oauth/register`, { method: "POST", body: JSON.stringify({ redirect_uris: ["http://evil.example/cb"] }) }));
    expect(res.status).toBe(400);
  });
});
