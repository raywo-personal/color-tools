// ESLint flat config. `pnpm lint` runs this plus tools/lint-sizes.js, which
// covers the sizing and mobile-first rules ESLint cannot see.
//
// This file is CommonJS on purpose: package.json declares no "type", so a .js
// config is loaded as CommonJS.
const angular = require("angular-eslint");
const stylistic = require("@stylistic/eslint-plugin");
const tseslint = require("typescript-eslint");

// Shared with tools/lint-sizes.js so both halves of `pnpm lint` skip the same
// folders. The file says why they are skipped and when to take an entry out.
const V1_SCREENS = require("./tools/v1-screens");

module.exports = tseslint.config(
  {
    ignores: [".angular/**", "dist/**", "tmp/**", ...V1_SCREENS],
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
