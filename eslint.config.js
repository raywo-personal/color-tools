// ESLint flat config. `pnpm lint` runs this plus tools/lint-sizes.js, which
// covers the sizing and mobile-first rules ESLint cannot see.
//
// This file is CommonJS on purpose: package.json declares no "type", so a .js
// config is loaded as CommonJS.
const path = require("node:path");
const angular = require("angular-eslint");
const stylistic = require("@stylistic/eslint-plugin");
const ts = require("typescript");
const tseslint = require("typescript-eslint");

// Shared with tools/lint-sizes.js so both halves of `pnpm lint` skip the same
// folders. The file says why they are skipped and when to take an entry out.
const V1_SCREENS = require("./tools/v1-screens");

// Every path alias tsconfig.json declares, except the engine's own. The fence
// around functions/ below forbids them all, and it reads them from the file so
// that a new alias is fenced the moment it exists - a copy kept here would let
// it through until somebody remembers this list. tsconfig.json carries
// comments, so it goes through TypeScript's reader rather than JSON.parse, as
// vitest.config.mcp.ts does.
const ENGINE_ALIAS = "@engine/*";
const {config: tsconfig} = ts.readConfigFile(
  path.join(__dirname, "tsconfig.json"),
  ts.sys.readFile,
);
const APP_ALIASES = Object.keys(tsconfig.compilerOptions.paths).filter(
  (alias) => alias !== ENGINE_ALIAS,
);

module.exports = tseslint.config(
  {
    // `resources/**` holds the design drafts, not app code: exported .dc.html
    // pages with their own support.js. They are not ours to lint, and a config
    // block for plain .js would otherwise pull them in.
    ignores: [
      ".angular/**",
      // `wrangler pages dev` writes its bundled Worker here while it runs.
      ".wrangler/**",
      "dist/**",
      "tmp/**",
      "resources/**",
      ...V1_SCREENS,
    ],
  },
  {
    files: ["src/**/*.ts"],
    // Lints the `template` of a component declared inline, so an inline
    // template is held to the same rules as an .html file.
    processor: angular.processInlineTemplates,
    extends: [tseslint.configs.recommended, angular.configs.tsRecommended],
    plugins: {"@stylistic": stylistic},
    rules: {
      // CLAUDE.md: double quotes, matching `quote_type = double` in
      // .editorconfig. The rule lives in @stylistic because ESLint core drops
      // its own `quotes` in v11.
      "@stylistic/quotes": ["error", "double", {avoidEscape: true}],

      // A leading underscore marks a binding that only exists to hold a
      // position - the full match a regex destructuring has to skip, or a
      // parameter a signature requires. Without the patterns the idiom has to
      // be written as a disable comment instead.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // CLAUDE.md: `input()`, `output()` and the signal queries instead of the
      // legacy decorators.
      "@angular-eslint/prefer-signals": "error",
      "@angular-eslint/prefer-output-emitter-ref": "error",

      // CLAUDE.md: host bindings and listeners go in the decorator's `host`
      // object, not on @HostBinding/@HostListener.
      "@angular-eslint/prefer-host-metadata-property": "error",

      // CLAUDE.md: @Service() for singletons; there is no @Injectable left in
      // src.
      "@angular-eslint/prefer-service-decorator": "error",

      // CLAUDE.md: the test helpers under src/testing stay out of app code.
      // The `exclude` in tsconfig.app.json does not stop this on its own -
      // TypeScript follows an import into an excluded file and compiles it
      // anyway, so app code importing a helper builds and ships vitest and
      // @angular/core/testing with it. The spec files and the helpers
      // themselves are exempted below.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@testing/*", "**/testing/*"],
              message:
                "Test helpers belong to the specs; app code must not import from src/testing.",
            },
          ],
        },
      ],

      "no-restricted-syntax": [
        "error",
        {
          // Standalone has been the default since Angular v19.
          // `prefer-standalone` reports only `standalone: false`.
          selector:
            "Decorator > CallExpression[callee.name=/^(Component|Directive|Pipe)$/] > ObjectExpression > Property[key.name='standalone'][value.value=true]",
          message: "Standalone is the default; remove `standalone: true`.",
        },
        {
          // OnPush is the Angular v22 default.
          // `prefer-on-push-component-change-detection` reports only the
          // opt-out (Eager), so the redundant explicit OnPush needs this.
          selector:
            "Decorator > CallExpression[callee.name='Component'] > ObjectExpression > Property[key.name='changeDetection'][value.property.name='OnPush']",
          message: "OnPush is the default; remove `changeDetection`.",
        },
      ],
    },
  },
  {
    // Where the test helpers are the point: the specs that use them and the
    // helpers themselves.
    files: ["src/**/*.spec.ts", "src/testing/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
  {
    // The MCP server under functions/ is plain TypeScript for a Cloudflare
    // Worker - no Angular, so none of the Angular rules above.
    files: ["functions/**/*.ts"],
    extends: [tseslint.configs.recommended],
    plugins: {"@stylistic": stylistic},
    rules: {
      "@stylistic/quotes": ["error", "double", {avoidEscape: true}],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // CLAUDE.md: the server wraps the colour engine and nothing else. The
      // engine is reached through @engine/*; the store, the screens, the
      // services, the test helpers and Angular itself stay out, or the Worker
      // bundle grows an Angular runtime it cannot use.
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@angular/*",
                "@ngrx/*",
                // Every alias tsconfig.json declares but @engine/*.
                ...APP_ALIASES,
                // The patterns match the import string as written, not the
                // resolved path, so the aliases above say nothing about a
                // relative import - "../../src/app/core/app-state.store"
                // passes them clean. This catches every path back into src/,
                // the engine's own included: the engine is reached through
                // its alias, not by walking up to it.
                "**/src/**",
              ],
              message:
                "functions/ imports the engine through @engine/* and nothing else from src/.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      // The accessibility preset: alt-text, elements-content,
      // label-has-associated-control, valid-aria, role-has-required-aria,
      // interactive-supports-focus, click-events-have-key-events,
      // mouse-events-have-key-events, no-autofocus, no-distracting-elements,
      // table-scope.
      angular.configs.templateAccessibility,
    ],
    rules: {
      // CLAUDE.md: no ngClass, no ngStyle. `[style.foo]` bindings stay
      // allowed, a static style attribute does not - Tailwind utilities carry
      // the styling.
      "@angular-eslint/template/prefer-class-binding": "error",
      "@angular-eslint/template/no-inline-styles": [
        "error",
        {allowNgStyle: false, allowBindToStyle: true},
      ],

      // CLAUDE.md: NgOptimizedImage for static images.
      "@angular-eslint/template/prefer-ngsrc": "error",

      // A positive tabindex reorders the tab sequence away from the DOM order.
      "@angular-eslint/template/no-positive-tabindex": "error",
    },
  },
);
