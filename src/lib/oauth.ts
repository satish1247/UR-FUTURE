import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/firebase/admin";

// Minimal OAuth 2.1 authorization server so claude.ai can connect to the MCP server as a
// connector: dynamic client registration, authorization code + PKCE (S256), refresh tokens.
// The site owner approves a connection by entering MCP_SECRET on the /oauth/authorize page.

const ACCESS_TTL = 60 * 60 * 24 * 7; // seconds
const REFRESH_TTL = 60 * 60 * 24 * 90;
const CODE_TTL = 5 * 60;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const nowSec = () => Math.floor(Date.now() / 1000);

export function ownerSecretMatches(given: string): boolean {
  const secret = process.env.MCP_SECRET;
  if (!secret || secret.length < 32) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Loopback (Claude Code) or https redirect URIs only. */
export function validRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/** Loopback redirects may use any port (RFC 8252). */
function sameRedirect(registered: string, given: string): boolean {
  if (registered === given) return true;
  try {
    const a = new URL(registered);
    const b = new URL(given);
    const loop = (h: string) => h === "localhost" || h === "127.0.0.1";
    return a.protocol === "http:" && loop(a.hostname) && a.hostname === b.hostname && a.pathname === b.pathname && a.search === b.search;
  } catch {
    return false;
  }
}

export interface OAuthClient {
  clientId: string;
  name: string;
  redirectUris: string[];
  createdAt: string;
}

export async function registerClient(name: string, redirectUris: string[]): Promise<OAuthClient> {
  const client: OAuthClient = { clientId: random(), name: name.slice(0, 100) || "MCP client", redirectUris, createdAt: new Date().toISOString() };
  await db().collection("oauthClients").doc(client.clientId).set(client);
  return client;
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(clientId)) return null;
  const doc = await db().collection("oauthClients").doc(clientId).get();
  return doc.exists ? (doc.data() as OAuthClient) : null;
}

export function redirectAllowed(client: OAuthClient, uri: string): boolean {
  return client.redirectUris.some((r) => sameRedirect(r, uri));
}

export async function createCode(p: { clientId: string; redirectUri: string; codeChallenge: string }): Promise<string> {
  const code = random();
  await db().collection("oauthCodes").doc(sha256(code)).set({ ...p, expiresAt: nowSec() + CODE_TTL });
  return code;
}

interface TokenPair {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

async function issueTokens(clientId: string): Promise<TokenPair> {
  const access = random();
  const refresh = random();
  const tokens = db().collection("oauthTokens");
  await Promise.all([
    tokens.doc(sha256(access)).set({ kind: "access", clientId, expiresAt: nowSec() + ACCESS_TTL }),
    tokens.doc(sha256(refresh)).set({ kind: "refresh", clientId, expiresAt: nowSec() + REFRESH_TTL }),
  ]);
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL, refresh_token: refresh, scope: "jobs" };
}

export type TokenResult = { ok: true; tokens: TokenPair } | { ok: false; error: "invalid_grant" | "invalid_request" };

export async function exchangeCode(p: { code: string; clientId: string; redirectUri: string; codeVerifier: string }): Promise<TokenResult> {
  const ref = db().collection("oauthCodes").doc(sha256(p.code));
  const doc = await ref.get();
  if (!doc.exists) return { ok: false, error: "invalid_grant" };
  await ref.delete(); // single use
  const c = doc.data() as { clientId: string; redirectUri: string; codeChallenge: string; expiresAt: number };
  const challenge = createHash("sha256").update(p.codeVerifier).digest("base64url");
  if (c.expiresAt < nowSec() || c.clientId !== p.clientId || c.redirectUri !== p.redirectUri || challenge !== c.codeChallenge) {
    return { ok: false, error: "invalid_grant" };
  }
  return { ok: true, tokens: await issueTokens(p.clientId) };
}

export async function refreshTokens(p: { refreshToken: string; clientId: string }): Promise<TokenResult> {
  const ref = db().collection("oauthTokens").doc(sha256(p.refreshToken));
  const t = (await ref.get()).data() as { kind: string; clientId: string; expiresAt: number } | undefined;
  if (!t || t.kind !== "refresh" || t.clientId !== p.clientId || t.expiresAt < nowSec()) return { ok: false, error: "invalid_grant" };
  await ref.delete(); // rotate: the old refresh token stops working
  return { ok: true, tokens: await issueTokens(p.clientId) };
}

export async function validAccessToken(token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) return false;
  const t = (await db().collection("oauthTokens").doc(sha256(token)).get()).data() as { kind: string; expiresAt: number } | undefined;
  return !!t && t.kind === "access" && t.expiresAt > nowSec();
}

export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["jobs"],
  };
}

export function protectedResourceMetadata(origin: string) {
  return { resource: `${origin}/api/mcp`, authorization_servers: [origin], scopes_supported: ["jobs"], bearer_methods_supported: ["header"] };
}
