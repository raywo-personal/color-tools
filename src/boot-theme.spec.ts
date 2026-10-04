import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {ColorTheme} from "@common/models/color-theme.model";
import {EMPTY_SETTINGS, LOCAL_STORAGE_KEY} from "@common/models/local-storage.model";
import {initialState} from "@core/models/app-state.model";


/**
 * The boot script sits in `src/index.html` because it has to run before the
 * first paint, which puts it outside TypeScript's reach: its storage key and
 * its fallback are string literals no compiler compares against the constants
 * they mirror. Drifting apart is the bug this whole file exists for, so the
 * test reads the real file and runs the real script rather than a copy.
 */
const INDEX_HTML = readFileSync("src/index.html", "utf8");

const DARK_QUERY = "(prefers-color-scheme: dark)";


function bootScript(): string {
  const matches = [...INDEX_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)];

  // Exactly one, because a second inline script would let every expectation
  // below pass against the wrong one.
  if (matches.length !== 1) {
    throw new Error(
      `src/index.html carries ${matches.length} inline scripts, expected 1`
    );
  }

  return matches[0][1];
}


/**
 * `window`, `document` and `localStorage` arrive as parameters, so they shadow
 * the globals the script would otherwise reach. A script reading a key other
 * than `LOCAL_STORAGE_KEY`, or asking a query other than the dark one, gets
 * nothing back and fails the expectations below.
 */
function runBootScript(stored: string | null, prefersDark: boolean): string | null {
  const localStorageStub = {
    getItem: (key: string) => key === LOCAL_STORAGE_KEY ? stored : null
  };

  const windowStub = {
    matchMedia: (query: string) => ({matches: query === DARK_QUERY && prefersDark})
  };

  new Function("window", "document", "localStorage", bootScript())(
    windowStub,
    document,
    localStorageStub
  );

  return document.documentElement.getAttribute("data-theme");
}


function settings(colorTheme: ColorTheme): string {
  return JSON.stringify({...EMPTY_SETTINGS, colorTheme});
}


/** What `ColorThemeService` would put on the root for the same state. */
function resolved(theme: ColorTheme, prefersDark: boolean): string {
  if (theme !== "system") return theme;

  return prefersDark ? "dark" : "light";
}


describe("the boot theme script in index.html", () => {

  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });


  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });


  it("writes the theme onto the root element", () => {
    runBootScript(settings("dark"), false);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.body.getAttribute("data-theme")).toBeNull();
  });


  it("keeps a stored light or dark against the opposite system setting", () => {
    expect(runBootScript(settings("light"), true)).toBe("light");
    expect(runBootScript(settings("dark"), false)).toBe("dark");
  });


  it("resolves a stored 'system' the way ColorThemeService does", () => {
    expect(runBootScript(settings("system"), true)).toBe("dark");
    expect(runBootScript(settings("system"), false)).toBe("light");
  });


  it("falls back to the app's own initial theme when nothing is stored", () => {
    // A first-time visitor: the header control reads `initialState`, so the
    // document has to arrive at whatever that same state resolves to.
    expect(runBootScript(null, true))
      .toBe(resolved(initialState.colorTheme, true));
    expect(runBootScript(null, false))
      .toBe(resolved(initialState.colorTheme, false));
  });


  it("leaves the attribute off when the stored settings are unreadable", () => {
    // No attribute is the light palette, which is the best an unreadable
    // setting can do - throwing would leave the page without its app.
    expect(runBootScript("{not json", true)).toBeNull();
  });

});


/**
 * Beasties inlines the rules that match the *static* `index.html`, whose root
 * carries no `data-theme` yet, so with critical CSS inlining on it defers the
 * `[data-theme="dark"]` block and the script above paints light for a dark
 * visitor after all. `CLAUDE.md` records the reason, which reaches whoever
 * reads it and not whoever regenerates `angular.json` or chases the
 * render-blocking stylesheet - and test, lint and build all stay green either
 * way. The check lives in this file because the boot script is what it
 * protects, and because `node:fs` is reachable from here alone.
 */
describe("critical CSS inlining in angular.json", () => {

  interface BuildConfiguration {
    optimization?: boolean | {styles?: {inlineCritical?: boolean}};
  }

  interface AngularJson {
    projects: Record<string, {
      architect: {build: {configurations: Record<string, BuildConfiguration>}};
    }>;
  }

  const angularJson = JSON.parse(readFileSync("angular.json", "utf8")) as AngularJson;
  const configurations = angularJson.projects["ColorTools"].architect.build.configurations;


  function inlineCriticalOf(config: BuildConfiguration): boolean | undefined {
    const optimization = config.optimization;

    if (typeof optimization !== "object") return undefined;

    return optimization.styles?.inlineCritical;
  }


  it("is off in every configuration that optimizes at all", () => {
    const optimizing = Object.entries(configurations)
      .filter(([, config]) => config.optimization !== false);

    // Named explicitly so an empty list cannot pass as agreement: these two
    // are the builds that ship.
    expect(optimizing.map(([name]) => name))
      .toEqual(expect.arrayContaining(["production", "cloudflare"]));

    for (const [name, config] of optimizing) {
      expect(inlineCriticalOf(config), `${name} must set styles.inlineCritical to false`)
        .toBe(false);
    }
  });

});
