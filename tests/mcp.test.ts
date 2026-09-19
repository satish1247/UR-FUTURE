/* eslint-disable @typescript-eslint/no-explicit-any -- tests build deliberately invalid payloads */
// Runs against the Firestore emulator: npm run test:emu
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/mcp/route";
import { getJob } from "@/lib/jobs/repo";
import { SAMPLE_JOBS } from "@/lib/seed/sample-jobs";

const SECRET = "t".repeat(40);
process.env.MCP_SECRET = SECRET;

async function connect(token = SECRET) {
  const client = new Client({ name: "test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost/api/mcp"), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
    // Call the route handler directly instead of a real server.
    fetch: (url, init) => POST(new Request(url, init)),
  });
  await client.connect(transport);
  return client;
}

type Out = Record<string, any>;
const call = async (c: Client, name: string, args: Record<string, unknown>) =>
  (await c.callTool({ name, arguments: args })).structuredContent as Out;

describe("MCP server", () => {
  let client: Client;
  const job = { ...structuredClone(SAMPLE_JOBS[1]), applyUrl: `https://example.com/mcp-test-${Date.now()}` };

  beforeAll(async () => {
    expect(process.env.FIRESTORE_EMULATOR_HOST, "run via npm run test:emu").toBeTruthy();
    client = await connect();
  });

  it("rejects a wrong token", async () => {
    await expect(connect("wrong")).rejects.toThrow();
  });

  it("lists all five tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["get_ingestion_config", "list_recent_jobs", "log_run", "mark_job_expired", "upsert_job"],
    );
  });

  it("returns ingestion config", async () => {
    expect((await call(client, "get_ingestion_config", {})).config.perRunCap).toBeGreaterThan(0);
  });

  it("upserts a good job, then dedupes it on the second push", async () => {
    const first = await call(client, "upsert_job", { job });
    expect(first.result).toBe("created");
    const again = await call(client, "upsert_job", { job: { ...job, applyUrl: `${job.applyUrl}?utm_source=x` } });
    expect(again).toMatchObject({ result: "updated", dedupeKey: first.dedupeKey });
    expect((await getJob(first.dedupeKey))?.status).toBe("active");

    const recent = await call(client, "list_recent_jobs", { days: 1 });
    expect(recent.jobs.some((j: Out) => j.dedupeKey === first.dedupeKey)).toBe(true);
  });

  it("rejects a bad job with readable reasons", async () => {
    const bad = await call(client, "upsert_job", { job: { ...job, track: "hardware", applyUrl: "http://x.com" } });
    expect(bad.result).toBe("rejected");
    expect(bad.errors.join("\n")).toMatch(/track/);
    expect(bad.errors.join("\n")).toMatch(/https/);
  });

  it("expires a job", async () => {
    const { dedupeKey } = await call(client, "upsert_job", { job });
    expect((await call(client, "mark_job_expired", { dedupeKey })).result).toBe("expired");
    expect((await getJob(dedupeKey))?.status).toBe("expired");
    expect((await call(client, "mark_job_expired", { dedupeKey: "0".repeat(64) })).result).toBe("not_found");
  });

  it("logs a run", async () => {
    const now = new Date().toISOString();
    const out = await call(client, "log_run", { startedAt: now, finishedAt: now, found: 3, added: 1, updated: 1, skipped: 1, errors: [], notes: "test" });
    expect(out.result).toBe("logged");
  });
});
