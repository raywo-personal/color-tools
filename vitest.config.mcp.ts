// Vitest config for the MCP server under functions/. It is separate from the
// app's test run on purpose: the server has no DOM, so it runs in node rather
// than happy-dom, and `ng test` only sees src/**.
import {resolve} from "node:path";
import ts from "typescript";
import {defineConfig} from "vitest/config";


/**
 * Reads the `paths` aliases from tsconfig.json so the specs resolve
 * `@common/*` and friends the same way the app does. The file carries
 * comments, so it goes through TypeScript's reader rather than JSON.parse.
 */
function pathAliases(): {find: RegExp; replacement: string}[] {
  const {config} = ts.readConfigFile(resolve(__dirname, "tsconfig.json"), ts.sys.readFile);
  const paths: Record<string, string[]> = config.compilerOptions.paths;

  return Object.entries(paths).map(([alias, [target]]) => ({
    find: new RegExp(`^${alias.replace("/*", "")}/(.*)$`),
    replacement: resolve(__dirname, target.replace("/*", "/$1")),
  }));
}


export default defineConfig({
  resolve: {alias: pathAliases()},
  test: {
    environment: "node",
    include: ["functions/**/*.spec.ts"],
  },
});
