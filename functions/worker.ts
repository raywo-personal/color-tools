import {ExportedHandler, Fetcher} from "@cloudflare/workers-types";
import {handleMcpRequest} from "./mcp/server";


export interface WorkerEnv {
  ASSETS: Fetcher;
  /** google-webfonts-proxy, bound under `services` in wrangler.jsonc. */
  FONTS: Fetcher;
}


/**
 * `isMcpPath()` and `isFontsPath()` together are the paths
 * `run_worker_first` in wrangler.jsonc sends here ahead of the assets. Keep
 * the list and the functions in step: a path listed there but not here
 * reaches the assets after all, one listed here but not there never reaches
 * the Worker at all.
 */
export function isMcpPath(pathname: string): boolean {
  return pathname === "/mcp" || pathname.startsWith("/mcp/");
}


/**
 * The paths handed to google-webfonts-proxy. The proxy has no public entry
 * of its own, so this is the only way the font picker reaches it.
 */
export function isFontsPath(pathname: string): boolean {
  return pathname === "/webfonts" || pathname.startsWith("/webfonts/");
}


/**
 * The Worker's entry, and the only file that knows the host. A request
 * that matches no asset and is no navigation also lands here - a stale
 * chunk, say - so everything but `/mcp` and `/webfonts` goes back to the
 * assets rather than to the MCP server.
 */
export default {
  fetch(request, env) {
    const {pathname} = new URL(request.url);

    if (isMcpPath(pathname)) {
      return handleMcpRequest(request);
    }

    // The request goes on unchanged: the proxy lets a caller without an
    // `Origin` through only on `Sec-Fetch-Site: same-origin`, which the
    // visitor's browser set.
    if (isFontsPath(pathname)) {
      return env.FONTS.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<WorkerEnv>;
