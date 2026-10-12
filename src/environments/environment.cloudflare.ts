import {Environment} from "./environment.model";


export const environment: Environment = {
  // Relative on purpose: functions/worker.ts hands /webfonts to
  // google-webfonts-proxy through a service binding, so the request stays
  // same-origin and the proxy needs no public entry of its own.
  webFontsApiUrl: "/webfonts"
};
