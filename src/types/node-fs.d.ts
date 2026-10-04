/**
 * `boot-theme.spec.ts` reads `src/index.html` from disk, because the boot
 * script it checks cannot be imported: it is markup, not a module. Vitest runs
 * on Node, so `readFileSync` is there - only its types are not, and pulling in
 * `@types/node` for one call would put Node's whole surface within reach.
 *
 * `tsconfig.app.json` excludes this file for the same reason, so the app
 * program cannot import `node:fs` either. Keep the exclusion when moving it.
 */
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}
