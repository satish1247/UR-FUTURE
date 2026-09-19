import { readLogo } from "@/lib/logo";

export async function GET(_req: Request, ctx: RouteContext<"/api/logo/[id]">) {
  const logo = await readLogo((await ctx.params).id);
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "content-type": logo.contentType,
      // URL carries a content hash (?v=), so it can be cached for a year by browsers and Vercel's CDN.
      "cache-control": "public, max-age=31536000, immutable",
      // SVGs could carry script; never let this response run as a document.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "x-content-type-options": "nosniff",
    },
  });
}
