import {describe, expect, it} from "vitest";
import {handleMcpRequest} from "./server";


const MCP_URL = "http://localhost/mcp";

function jsonRpc(body: object): Request {
  return new Request(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: {name: "server.spec", version: "0.0.0"},
  },
};


/**
 * The HTTP half the Pages Function hands over: a web-standard Request in, a
 * Response out. The tool itself is covered through the protocol in
 * describe-color.spec.ts; this pins the transport's stateless behaviour.
 */
describe("handleMcpRequest", () => {

  it("should answer an initialize request with JSON, not an event stream", async () => {
    const response = await handleMcpRequest(jsonRpc(INITIALIZE));
    const body = await response.json() as {result: {serverInfo: {name: string}}};

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.result.serverInfo.name).toBe("colortools");
  });

  it("should not hand out a session id", async () => {
    const response = await handleMcpRequest(jsonRpc(INITIALIZE));

    expect(response.headers.get("mcp-session-id")).toBeNull();
  });

  it("should answer a tool call without a preceding initialize on the same connection", async () => {
    // Stateless: every request builds its own server, so a client that
    // initialized against one Pages invocation may call a tool on the next.
    const response = await handleMcpRequest(jsonRpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {name: "describe_color", arguments: {color: "#1e90ff"}},
    }));
    const body = await response.json() as {result: {isError?: boolean}};

    expect(response.status).toBe(200);
    expect(body.result.isError).toBeFalsy();
  });

  it("should answer a body that is not JSON with a JSON-RPC parse error", async () => {
    const response = await handleMcpRequest(new Request(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: "not json",
    }));
    const body = await response.json() as {error: {code: number}};

    expect(response.status).toBe(400);
    expect(body.error.code).toBe(-32700);
  });

});
