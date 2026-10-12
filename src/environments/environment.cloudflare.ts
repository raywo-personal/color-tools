import {Environment} from "./environment.model";


export const environment: Environment = {
  // Relative on purpose: a Worker route on the skillbird.de zone sends
  // color-tools.skillbird.de/webfonts* to google-webfonts-proxy, so the
  // request stays same-origin and no workers.dev URL is called. The route
  // does not reach a preview's workers.dev URL, so a preview has no font
  // list.
  webFontsApiUrl: "/webfonts"
};
