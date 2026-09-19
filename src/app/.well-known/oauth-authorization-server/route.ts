import { authServerMetadata } from "@/lib/oauth";

export const GET = (req: Request) => Response.json(authServerMetadata(new URL(req.url).origin), { headers: { "access-control-allow-origin": "*" } });
