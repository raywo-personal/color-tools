import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {WebStandardStreamableHTTPServerTransport} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {registerDescribeColor} from "./tools/describe-color";
import {registerCheckContrast} from "./tools/check-contrast";
import {registerFindTextColor} from "./tools/find-text-color";


export function createMcpServer(): McpServer {
  const server = new McpServer({name: "colortools", version: "0.0.1"});
  registerDescribeColor(server);
  registerCheckContrast(server);
  registerFindTextColor(server);

  return server;
}


export async function handleMcpRequest(request: Request): Promise<Response> {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  await server.connect(transport);

  return transport.handleRequest(request);
}
