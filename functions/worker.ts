import {ExportedHandler, Fetcher} from "@cloudflare/workers-types";
import {handleMcpRequest} from "./mcp/server";


export interface WorkerEnv {
  ASSETS: Fetcher;
}


/**
 * The paths `run_worker_first` in wrangler.jsonc sends here ahead of the
 * assets. Keep the two in step: a path listed there but not here reaches
 * the assets after all, one listed here but not there never reaches the
 * Worker at all.
 */
export function isMcpPath(pathname: string): boolean {
  return pathname === "/mcp" || pathname.startsWith("/mcp/");
}


/**
 * The Worker's entry, and the only file that knows the host. A request
 * that matches no asset and is no navigation also lands here - a stale
 * chunk, say - so everything but `/mcp` goes back to the assets rather
 * than to the MCP server.
 */
export default {
  fetch(request, env) {
    if (isMcpPath(new URL(request.url).pathname)) {
      return handleMcpRequest(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;
