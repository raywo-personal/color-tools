// The v1 code, as glob patterns relative to the repository root.
//
// It is no longer routed and is meant to be deletable in one piece, so its lint
// findings are not worth fixing. Both halves of `pnpm lint` read this list:
// eslint.config.js and tools/lint-sizes.js.
//
// Remove an entry together with the folder it names, so no exclusion outlives
// its path.
//
// Only the `components/` folders are v1. `palettes/helper/`, `contrast/helper/`
// and their `models/` are the live engine and stay in the lint run - deleting a
// v1 screen means deleting its `components/`, never the folder above it.
module.exports = [
  "src/app/converter/**",
  "src/app/palettes/components/**",
  "src/app/contrast/components/**",
  "src/app/header/**",

  // The v1 widgets. They sit under `common/` rather than in a screen folder,
  // but they reach the bundle from nowhere: `not-found` is the only thing under
  // `common/components/` that main.ts can still reach, and these eight carry
  // Bootstrap classes and .scss files that go with the v1 screens using them.
  //
  // Listed one by one on purpose. A pattern that excluded `common/components/`
  // and exempted `not-found` would silently swallow the next v2 component
  // written there.
  "src/app/common/components/color-area/**",
  "src/app/common/components/color-picker/**",
  "src/app/common/components/font-selector/**",
  "src/app/common/components/hsl-color-edit/**",
  "src/app/common/components/hue-slider/**",
  "src/app/common/components/luminance-slider/**",
  "src/app/common/components/saturation-slider/**",
  "src/app/common/components/toggle-button/**",
];
