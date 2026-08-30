# CLAUDE.md

Guidance for coding agents working in this repository. This is the single source
of truth for project conventions - `AGENTS.md` in the repository root is a
symlink to this file, so any agent that looks for either name reads the same
content.

## Questions Are Not Work Orders

- A question asks for an answer, not for a change. Diagnose the cause, explain the reasoning, name the options, recommend one - then stop.
- Editing files, adding or removing dependencies, running migrations and committing require an explicit instruction to do it, however obvious or small the change looks.
- Reading files, searching the codebase and running read-only commands is always fine.

## Project Overview

ColorTools is an Angular 22 web application for color manipulation and analysis, featuring a color converter, a palette generator and a contrast checker. The app uses signals-based state management with @ngrx/signals and deploys to Cloudflare Pages.

The app is zoneless (`provideZonelessChangeDetection()` in `src/app/app.config.ts`) and fully signal-based. There is no zone.js and no `ChangeDetectionStrategy` annotation anywhere in `src/` - Angular 22 makes OnPush the default.

Live site: https://color-tools.skillbird.de/

## Development Commands

### Basic Commands

- `pnpm install` - Install dependencies
- `pnpm start` - Start dev server (defaults to development configuration)
- `pnpm build` - Build for production
- `pnpm test` - Run tests with Vitest
- `pnpm run build:cloudflare` - Build for the Cloudflare Pages deployment
- `pnpm run test:ci` - Single test run (no watch), as used in CI
- `pnpm run cf <args>` - Run wrangler against this project's Cloudflare account; sources the untracked `.cloudflare.env` (see README)

### Build Configurations

The project has four build configurations:

- `production` - Production build with optimization and output hashing
- `cloudflare` - Cloudflare Pages deployment (same as production but without localization)
- `development` - Dev build with source maps, no optimization
- `testing` - Build target consumed by the `test` target; not meant to be built directly

## Claude Code Agents And Skills

The skills and agents this project relies on come from the `rw` plugin
(marketplace `raywo-personal`, repository
`raywo-personal/claude-agents-and-skills`). The plugin is installed per user,
not vendored into this repository - there is nothing under `.claude/` to
commit, and `.claude/settings.local.json` stays untracked.

That plugin is **shared across projects**, so a change to a skill affects every
project using it. Project-specific rules therefore do not belong there: if a
convention only holds for ColorTools, it goes in this file. The skills describe
general practice; this file describes what this codebase actually does, and it
wins where the two differ.

## Writing Text For GitHub

Anything GitHub renders as HTML is **not** hard-wrapped - its UI does the
wrapping, and a hard wrap produces ragged paragraphs and breaks quoting in
comments. This covers issue bodies and comments, PR descriptions, PR and review
comments, replies to review comments, and release notes.

One paragraph is one line. Break only where the break carries meaning: between
paragraphs, per list item, per table row, and around code blocks.

Hard-wrapping stays for anything read in monospace without reflow: commit
messages (subject at most 50 characters, body wrapped at 72), files in this
repository including this one, and code comments.

This is the convention from the `rw` plugin's README, adopted here because
that README asks each project to adopt it explicitly - the rule applies
whenever GitHub text is written, including when no skill is running.

## Architecture

### State Management

The app uses a centralized state management system built on @ngrx/signals:

- **AppStateStore** (`src/app/core/app-state.store.ts`) - Central signal store configured with:
  - Initial state from `src/app/core/models/app-state.model.ts`
  - Reducers that handle state updates via events
  - Effects that trigger side effects (localStorage persistence, routing, theme changes)

- **Events** - Domain-specific event emitters located in `src/app/core/{domain}/{domain}.events.ts`:
  - `converterEvents` - Color conversion and manipulation
  - `palettesEvents` - Palette generation and updates
  - `contrastEvents` - Contrast color management (text/background color changes, color switching, random generation, restoration)
  - `commonEvents` - Theme changes and common actions
  - `transferEvents` - Cross-domain color transfers (palette starters, contrast colors)
  - `persistenceEvents` - State persistence to localStorage

- **Reducers** – Pure functions in `src/app/core/{domain}/{domain}.reducers.ts` that update state based on events

- **Effects** – Side effect handlers in `src/app/core/{domain}/{domain}.effects.ts`, all registered in `allEffects()` in `src/app/core/all-effects.ts`:
  - `setColorTheme$` - Theme application via ColorThemeService
  - `loadFont$` - Google font loading via GoogleFontLoaderService
  - `setBackgroundColor$` - Background color updates
  - `navigateToPalette$` - Navigation to palette URLs
  - `navigateToContrast$` - Navigation to contrast URLs
  - `colorChanged$` - Theme reaction to a changed converter color
  - `anyPersistableEvents$` - Maps every persistable event to `saveAppState()`
  - `persist$` - State persistence to localStorage

### Application Structure

State is divided into four domains:

1. **Converter** (`src/app/converter/`) - Color conversion and tint/shade generation

- Manages current color, display format (RGB/HSL/HEX/OKLCH), and color space
  settings
- Generates tints and shades using Bezier interpolation when enabled
- State: `currentColor`, `textColor`, `useAsBackground`, `correctLightness`, `useBezier`, `displayColorSpace`, `tintColors`, `shadeColors`

2. **Palettes** (`src/app/palettes/`) - Color palette generation

- Ten palette styles, defined in `PaletteStyles` (`src/app/palettes/models/palette-style.model.ts`): random, analogous, muted-analog-split, harmonic, monochromatic, vibrant-balanced, high-contrast, triadic, complementary, split-complementary
- `generatePalette()` in `src/app/palettes/helper/palette.helper.ts` dispatches the style to its generator
- Each style has a dedicated generator in `src/app/palettes/helper/*-palette.helper.ts`
- Palettes support pinned colors that remain fixed during regeneration
- State: `paletteStyle`, `useRandomStyle`, `currentPalette`

3. **Contrast** (`src/app/contrast/`) - Color contrast analysis and accessibility

- Analyzes text and background color combinations for readability
- Uses APCA (Accessible Perceptual Contrast Algorithm) for contrast calculation
- Supports color switching, random generation, and restoration from IDs
- State: `contrastColors` (text color, background color, contrast value)

4. **Common** (`src/app/common/`) - Shared utilities and theme management

- State: `colorTheme` (light/dark/system), `selectedFont`

### Palette ID System

Palettes can be encoded into shareable URLs via a compact ID system:

- **Encoding** (`paletteIdFromPalette`) - Converts palette to a fixed-length 43-character string:
  - First character: style index as a single decimal digit, parsed with `parseInt(id[0], 10)`
  - Remaining 42 characters: base62-encoded payload of 31 bytes - 30 RGB bytes for 10 colors (5 current + 5 starting colors) plus one trailing byte holding the pinned-colors bitmask
  - The payload is fixed-length, so the pinned bitmask is always encoded, even when nothing is pinned

- **Decoding** (`paletteFromId`) - Restores palette from ID:
  - Extracts style, colors, and pinned state
  - Reconstructs full palette with starting colors for regeneration

This allows palettes to be shared via URL: `/palettes/{paletteId}`

**Known limit:** the style index occupies exactly one decimal digit, so at most
ten styles are representable. `PaletteStyles` currently holds ten entries - the
format is at capacity. An eleventh style would need a wider index field;
`styleFromPaletteId` would otherwise silently fall back to a random style.

### Contrast ID System

Contrast color pairs can be encoded into shareable URLs via a compact ID system:

- **Encoding** (`contrastIdFromColors`) - Converts two colors to base62-encoded string:
  - 6 bytes (2 colors × 3 RGB channels) encoded in base62
  - Fixed length: 9 characters
  - Encodes text color RGB + background color RGB

- **Decoding** (`contrastColorsFromId`) - Restores colors from ID:
  - Extracts RGB values for both text and background colors
  - Calculates APCA contrast value between the colors
  - Returns ContrastColors object with text, background, and contrast value

- **Random Generation** (`generateRandomContrastColors`) - Creates random color pairs:
  - Generates random background color
  - Finds harmonizing text color for optimal readability
  - Calculates APCA contrast

This allows contrast color pairs to be shared via URL: `/contrast/{contrastId}`

### Color Libraries

The app uses two main color libraries:

- **chroma-js** - Primary color manipulation (conversions, interpolation, color math)
- **color-namer** - Color name identification, used for its color lists only

`src/app/common/helpers/color-name.helper.ts` deliberately does **not** call
`color-namer`'s own entry point. It imports the six color lists
(`color-namer/lib/colors/*`) and does the nearest-color search with the app's
own chroma-js. Importing the package proper pulls in a second, much older
chroma-js (1.4.1) plus `es6-weak-map` and its `es5-ext` tail - 59 kB of raw
bundle for a `WeakMap` cache that never hits, because `color-namer` keys it on a
freshly allocated object on every call.

Both variants produce identical names. The deep imports are declared in
`src/types/color-namer-lists.d.ts` and listed in `allowedCommonJsDependencies`
in `angular.json`, because the lists are CommonJS.

**The distance must be measured from `color.hex()`, not from the `Color`
object.** `color-namer` was always handed a hex string, so it compared the
rounded 8-bit color; a chroma `Color` carries unrounded channels, and
`chroma.hsl()` plus the Bezier interpolation used for tints, shades and palettes
produce fractional ones. Passing the object through renames roughly 5 % of those
colors and makes a palette disagree with its own shared-URL round trip, which
goes through 8-bit RGB. A sweep over the integer RGB cube cannot detect this -
there the two agree exactly. `color-name.helper.spec.ts` pins the behaviour.

Note that `colorName()` must stay synchronous: `generatePalette()` and
`paletteFromId()` call it from reducer and route-guard code paths.

### Palette Generators Build Colors In OKLch

A generator that holds lightness and rotates hue must build its colors with
`fromOklch()` (`src/app/common/helpers/color-from-oklch.helper.ts`), not with
`fromHsl()`. Equal HSL lightness is not equal perceived lightness: at the
default saturation a triad's members land up to 0.34 OKLch lightness apart, so
one member glows and another sinks.

**Chroma is clamped per hue, never levelled to a common floor.** sRGB does not
offer the same chroma everywhere - at `L = 0.60` the boundary sits at 0.104 for
cyan and 0.273 for magenta. `fromOklch()` therefore keeps lightness and hue
exact and lowers only the chroma the hue cannot hold. Do not instead pull every
member down to the lowest chroma its hues share: that ties a palette's vibrancy
to its unluckiest hue and makes one style look different from one seed to the
next.

HSL constants do not port. Offsets such as `baseSat - 0.65` were tuned by eye
against HSL's distortion; applied in OKLch they correct twice and have to be
re-tuned against the result.

**A member that sits lighter than the accents is lifted by a share of the room
above them, not by a fixed offset.** The accents follow a given base color, so
a light base leaves little room. A fixed offset runs past 1 there, `fromOklch()`
clamps it, and the member comes back as plain white - neither a color nor
distinguishable from its sibling. Express the lift as a share of `1 - baseLight`
and the jitter as a share of the lift.

**A generator passes a base color's lightness through `usableLightness()`
before it builds anything from it.** `maxChroma()` returns 0 at a lightness of
0 and 1, so a pure black or white base gives every member the same black or
white whatever its hue, and a regenerate repeats it unchanged. Both extremes
are reachable: a converter color and a contrast background each arrive as a
pinned `color0`.

### Bundle Budget

The initial budget is 700 kB warning / 800 kB error. It is meant to catch
regressions, so keep it close to the actual size rather than raising it to make
a warning go away - `pnpm build` prints the current initial total.

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json`:

- `@common/*` → `src/app/common/*`
- `@converter/*` → `src/app/converter/*`
- `@header/*` → `src/app/header/*`
- `@palettes/*` → `src/app/palettes/*`
- `@contrast/*` → `src/app/contrast/*`
- `@core/*` → `src/app/core/*`
- `@environments/*` → `src/environments/*`

Always use these aliases for imports within the codebase.

## Angular and TypeScript Conventions

These are the binding conventions for this repository. The
`angular-development` skill from the `rw` plugin carries the general Angular
guidance; where the two differ, this file wins because it describes what this
codebase actually does.

### Component Standards

- Keep components small and focused on a single responsibility
- Use standalone components (default, do NOT set `standalone: true`)
- Do NOT set `changeDetection` - OnPush is the Angular 22 default. Setting
  `ChangeDetectionStrategy.Eager` opts out of it and needs a written reason
- Use signals for state management via `signal()`, `computed()`, and `effect()`
- Use `input()` and `output()` functions instead of decorators
- `model()` already provides an `xChange` output. Do NOT add a second manual
  `output()` next to it - consumers bind `(xChange)`, and a component that
  writes to its own model signal emits it automatically (see the sliders in
  `src/app/common/components/`)
- Prefer signal queries (`viewChild()`, `contentChild()`) over the decorators
- Prefer inline templates for tiny components
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural directives
- Do NOT use `@HostBinding`/`@HostListener` - use the `host` object in decorators
- Do NOT use `ngClass` - use `[class.foo]` bindings
- Do NOT use `ngStyle` - use `[style.foo]` bindings
- Use `NgOptimizedImage` for static images (not inline base64)

### Templates

- Keep templates simple and free of complex logic - move it into a `computed()`
- No arrow functions in templates; they are not supported
- Do not rely on globals such as `new Date()` being available
- The app is signal-based throughout: there are no observables in templates.
  If one ever needs to reach a template, use `toSignal()` from
  `@angular/core/rxjs-interop` rather than the `async` pipe

### Forms

Only template-driven forms are in use:

- `FormsModule` with `ngModel` for every value input - the numeric and text
  fields (RGB, HSL, hex, OKLCH), the sliders and the font selector typeahead
- `ReactiveFormsModule` is deliberately absent. There is no `FormControl`,
  `FormGroup` or `formControl` binding anywhere in `src`. Do not add the import
  "just in case" - add it only together with an actual reactive control
- Do NOT wrap inputs in a `<form>` element for layout only. An implicit
  `NgForm` breaks `ngModel` registration across component boundaries and
  Angular 22 reports it as NG01354 (see commit `d03d83f`)

### Routing

- Routes are declared eagerly in `src/app/app.routes.ts`; there is no lazy
  loading. With three feature routes it would add indirection without benefit
- `withComponentInputBinding()` is active, so route params (`:paletteId`,
  `:contrastId`) arrive as component `input()`s
- Route guards live in `src/app/routes/` (`palette-route.guard.ts`,
  `contrast-route.guard.ts`)
- A trailing `**` route renders `NotFound`
  (`src/app/common/components/not-found/`). The SPA rewrite in
  `public/_redirects` answers every path with `index.html` and HTTP 200, so an
  unknown path cannot produce a real 404 status. The page makes the miss
  visible to the visitor instead of leaving the viewport blank
- Every route carries a `title`. Angular's `DefaultTitleStrategy` leaves the
  previous title standing when a route has none, so a route without one shows
  the tab title of wherever the visitor came from

**An invalid id and an unknown path answer differently, on purpose.**
`/palettes/garbage` matches `:paletteId`, so `paletteGuard` runs, finds the id
unrestorable and redirects to a freshly generated palette - the visitor lands on
a working tool. `/palettes/garbage/more` matches no route at all, falls through
to `**` and gets the not-found page. The asymmetry is the intended reading of
the two cases: an unrestorable id is recoverable input, because the route itself
exists and the tool works without it; a path that names nothing is not. Do not
"harmonize" the two by sending invalid ids to the not-found page - that would
trade a working palette for a dead end. `app.routes.spec.ts` pins both halves.

### Services

- Use the Angular 22 `@Service()` decorator for singleton services. It is
  auto-provided in the root injector, so `@Injectable({providedIn: 'root'})` is
  no longer needed - there is no `@Injectable` left in `src`
- Use `@Injectable()` only where a class genuinely must not be root-provided
  (or `@Service({autoProvided: false})` and an explicit `providers` entry)
- Use the `inject()` function instead of constructor injection
- Design services around a single responsibility

### TypeScript

- Use strict type checking (`strict`, `strictTemplates`,
  `typeCheckHostBindings`, `noImplicitReturns`, `noImplicitOverride` are all on)
- Prefer type inference when obvious
- Avoid `any` - use `unknown` when type is uncertain
- Use double quotes for strings (`quote_type = double` in `.editorconfig`)
- Import through the path aliases above, never through relative `../../` paths

### State Management

- Use signals for local component state
- Use `computed()` for derived state
- Do NOT use `mutate()` on signals - use `update()` or `set()`
- Keep state transformations pure
- App-wide state goes through the central store, not into component state -
  see the State Management section above and the
  `ngrx-signals-state-management` skill

## Component Style Guidelines

Tailwind CSS v4 is the only styling framework. Utilities go in the template,
where the element they style lives; a component's own style file stays minimal
or empty.

- Schematics set `inlineStyle: true` by default, so a new component starts with
  an inline `styles` block. Keep it there only for very short passages - a
  handful of declarations that stay readable inside the decorator. Everything
  beyond that belongs in the component's own `.css` file next to it, referenced
  through `styleUrl`
- Do NOT use `@apply` or `@reference` in component styles. `@apply` does not
  work in component-scoped CSS under Tailwind v4, and `@reference` makes it
  work only by triggering a full Tailwind pass per file. Reach the element from
  the template instead, put the host's utilities in `host: {class: "..."}`, or
  add an `@layer components` class to the global stylesheet
- Budget limits: 4kB warning, 8kB error per component (`anyComponentStyle`).
  The budget counts either form, so moving a block out of the decorator does
  not buy room
- Global entry point is `src/styles.css`

### The Design Tokens Are The Whole Palette

`src/styles.css` defines six neutral tokens - `bg`, `panel`, `text`, `dim`,
`line`, `field` - as `--color-*` in `@theme`, with a dark set overriding them
under `:root[data-theme="dark"]`. Because the token itself flips, a component
needs no `dark:` variant to follow the theme; write `bg-panel`, not
`bg-white dark:bg-neutral-900`.

**There is no themed accent color, and adding one is a design decision, not a
convenience.** The only saturated color on screen is the one the visitor is
working on. Tailwind's default palette is still reachable, so nothing stops a
stray `text-blue-600` - keep it out.

**The `@theme` block is `static`.** Without it Tailwind emits only the tokens
some utility class happens to use, and a plain `var(--color-panel)` in a
component stylesheet resolves to nothing in the light theme while working in
the dark one.

### The Theme Attribute Lives On The Root Element

`ColorThemeService` resolves the three stored states to two and writes
`data-theme="light"` or `"dark"` onto `<html>`. The stylesheet therefore never
sees `"system"`. The `dark:` variant is bound to that attribute through
`@custom-variant`, so `prefers-color-scheme` alone changes nothing - a visitor
who picked a theme keeps it.

### No Sass In New Styles

Tailwind v4 does not run through a preprocessor: the global stylesheet is plain
CSS, and `angular.json` sets `inlineStyleLanguage` and the component schematic
to `css`. The `.scss` files still present belong to v1 screens and go with
them; do not add more.

## Testing

- Test framework: Vitest, run through the `@angular/build:unit-test` builder
  (`runner: "vitest"`, `tsConfig: tsconfig.spec.json`, `buildTarget: :build:testing`)
- DOM environment: happy-dom, picked up from devDependencies - there is no
  explicit environment setting and no `vitest.config.*` in the repo
- Run all tests: `ng test` (or `pnpm test`); `ng test --watch=false` for a single run
- Component generation skips test files by default (configured in angular.json schematics)
