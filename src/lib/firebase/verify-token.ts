import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Google's public keys for Firebase Auth ID tokens (cached and refreshed by jose).
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

/**
 * Verifies a Firebase ID token the same way firebase-admin does: RS256 signature from
 * Google's keys, audience = project id, issuer = securetoken.google.com/<project>, not expired.
 * (firebase-admin/auth can't load on Vercel because its jwks-rsa dependency require()s ESM.)
 */
export async function verifyIdToken(token: string): Promise<FirebaseUser | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["RS256"],
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });
    if (!payload.sub || typeof payload.email !== "string") return null;
    if (typeof payload.auth_time === "number" && payload.auth_time * 1000 > Date.now() + 60_000) return null;
    return { uid: payload.sub, email: payload.email, emailVerified: payload.email_verified === true, name: typeof payload.name === "string" ? payload.name : undefined };
  } catch {
    return null;
  }
}
