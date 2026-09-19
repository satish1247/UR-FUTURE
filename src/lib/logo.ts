import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/firebase/admin";

const MAX_BYTES = 150_000;
const OK_TYPES = /^image\/(png|jpeg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon)$/;

/** Only public https hosts: no IP literals or local names (the URL comes from web content). */
function isPublicHttps(raw: string): boolean {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    return u.protocol === "https:" && host.includes(".") && !/^[\d.]+$/.test(host) && !host.includes(":") && !host.endsWith(".local") && !host.endsWith(".internal");
  } catch {
    return false;
  }
}

/**
 * Downloads a company logo and stores it in Firestore `logos/{id}` (no image service needed).
 * Returns the site path that serves it, or undefined if the image is unusable, so the site
 * shows the company initials instead of a broken image.
 */
export async function saveLogo(sourceUrl: string | undefined, id: string): Promise<string | undefined> {
  if (!sourceUrl) return undefined;
  if (sourceUrl.startsWith("/api/logo/")) return sourceUrl; // already stored
  if (!isPublicHttps(sourceUrl)) return undefined;
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(8000), redirect: "follow", headers: { "user-agent": "URFutureLogoFetcher/1.0" } });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!res.ok || !OK_TYPES.test(type) || !isPublicHttps(res.url)) return undefined;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return undefined;
    await db().collection("logos").doc(id).set({ contentType: type, data: bytes, sourceUrl, updatedAt: new Date().toISOString() });
    const version = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
    return `/api/logo/${id}?v=${version}`;
  } catch {
    return undefined;
  }
}

export async function readLogo(id: string): Promise<{ contentType: string; data: Buffer } | null> {
  if (!/^[a-f0-9]{16,64}$/.test(id)) return null;
  const doc = await db().collection("logos").doc(id).get();
  if (!doc.exists) return null;
  const { contentType, data } = doc.data() as { contentType: string; data: Buffer };
  return { contentType, data: Buffer.from(data) };
}
