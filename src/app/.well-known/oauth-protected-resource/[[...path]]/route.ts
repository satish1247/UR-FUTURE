import { protectedResourceMetadata } from "@/lib/oauth";

export const GET = (req: Request) => Response.json(protectedResourceMetadata(new URL(req.url).origin), { headers: { "access-control-allow-origin": "*" } });
