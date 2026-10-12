import {Fetcher} from "@cloudflare/workers-types";
import {describe, expect, it, vi} from "vitest";
import worker, {isMcpPath, WorkerEnv} from "./worker";


const ORIGIN = "https://color-tools.skillbird.de";

const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: {name: "worker.spec", version: "0.0.0"},
  },
};


function assetsAnswering(body: string): {env: WorkerEnv; fetch: ReturnType<typeof vi.fn>} {
  const fetch = vi.fn(async () => new Response(body));

  return {env: {ASSETS: {fetch} as unknown as Fetcher}, fetch};
}

function call(request: Request, env: WorkerEnv): Promise<Response> {
  // The handler is typed against the workers-types Request; the spec runs
  // in node, whose Request is the same web-standard shape.
  return Promise.resolve(worker.fetch(request as never, env) as unknown as Response);
}


describe("isMcpPath", () => {

  it("should take /mcp and every path below it", () => {
    expect(isMcpPath("/mcp")).toBe(true);
    expect(isMcpPath("/mcp/")).toBe(true);
    expect(isMcpPath("/mcp/anything")).toBe(true);
  });

  it("should leave paths that only start with the same letters to the assets", () => {
    expect(isMcpPath("/mcpx")).toBe(false);
    expect(isMcpPath("/")).toBe(false);
    expect(isMcpPath("/contrast")).toBe(false);
  });

});


describe("worker", () => {

  it("should answer /mcp from the MCP server, not from the assets", async () => {
    const {env, fetch} = assetsAnswering("<!doctype html>");
    const response = await call(new Request(`${ORIGIN}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(INITIALIZE),
    }), env);
    const body = await response.json() as {result: {serverInfo: {name: string}}};

    expect(body.result.serverInfo.name).toBe("colortools");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("should hand every other path back to the assets", async () => {
    const {env, fetch} = assetsAnswering("from the assets");
    const request = new Request(`${ORIGIN}/chunk-stale.js`);
    const response = await call(request, env);

    expect(await response.text()).toBe("from the assets");
    expect(fetch).toHaveBeenCalledWith(request);
  });

});
