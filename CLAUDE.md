# CLAUDE.md

Guidance for coding agents working in this repository. This is the single source
of truth for project conventions - `AGENTS.md` in the repository root is a
symlink to this file, so any agent that looks for either name reads the same
content.

## Questions Are Not Work Orders

- A question asks for an answer, not for a change. Diagnose the cause, explain
  the reasoning, name the options, recommend one – then stop.
- Editing files, adding or removing dependencies, running migrations and
  committing require an explicit instruction to do it, however obvious or small
  the change looks.
- Reading files, searching the codebase, and running read-only commands is always
  fine.

## Project Overview

ColorTools is an Angular 22 web application for color manipulation and analysis,
featuring a color converter, a palette generator, and a contrast checker. The app
uses signals-based state management with @ngrx/signals and deploys to Cloudflare
Pages.

The app is zoneless (`provideZonelessChangeDetection()` in
`src/app/app.config.ts`) and fully signal-based. There is no zone.js and no
`ChangeDetectionStrategy` annotation anywhere in `src/` - Angular 22 makes
OnPush the default.

Live site: https://color-tools.skillbird.de/

## Development Commands

### Basic Commands

- `pnpm install` - Install dependencies
- `pnpm start` - Start dev server (defaults to development configuration)
- `pnpm build` - Build for production
- `pnpm test` - Run tests with Vitest
- `pnpm run build:cloudflare` - Build for the Cloudflare Pages deployment
- `pnpm run test:ci` - Single test run (no watch), as used in CI
- `pnpm run cf <args>` - Run wrangler against this project's Cloudflare account;
  sources the untracked `.cloudflare.env` (see README)

### Build Configurations

The project has four build configurations:

- `production` - Production build with optimization and output hashing
- `cloudflare` - Cloudflare Pages deployment (same as production but without
  localization)
- `development` - Dev build with source maps, no optimization
- `testing` - Build target consumed by the `test` target; not meant to be built
  directly

## Claude Code Agents And Skills

Skills and agents come from the `rw` plugin (marketplace `raywo-personal`,
repository `raywo-personal/claude-agents-and-skills`), installed per user. There
is nothing under `.claude/` to commit, and `.claude/settings.local.json` stays
untracked.

The plugin is shared across projects, so a convention that only holds for
ColorTools goes in this file – and this file wins where the two differ.

## Writing Text For GitHub

Anything GitHub renders as HTML is **not** hard-wrapped – its UI wraps, and a
hard wrap produces ragged paragraphs and breaks quoting. One paragraph is one
line; break only between paragraphs, per list item, per table row, and around
code blocks. This covers issue bodies and comments, PR descriptions, review
comments, replies, and release notes.

Hard-wrapping stays where text is read in monospace without reflow: commit
messages (subject at most 50 characters, body at 72), files in this repository
including this one, and code comments.

## Architecture

### State Management

The app uses a centralized state management system built on @ngrx/signals:

- **AppStateStore** (`src/app/core/app-state.store.ts`) - Central signal store
  configured with:
  - Initial state from `src/app/core/models/app-state.model.ts`
  - Reducers that handle state updates via events
  - Effects that trigger side effects (localStorage persistence, routing, theme
    changes)

- **Events** - Domain-specific event emitters located in
  `src/app/core/{domain}/{domain}.events.ts`:
  - `converterEvents` - Color conversion and manipulation
  - `palettesEvents` - Palette generation and updates
  - `contrastEvents` - Contrast color management (text/background color changes,
    color switching, random generation, restoration)
  - `commonEvents` - Theme changes and common actions
  - `transferEvents` - Cross-domain color transfers (palette starters, contrast
    colors)
  - `persistenceEvents` - State persistence to localStorage

- **Reducers** – Pure functions in `src/app/core/{domain}/{domain}.reducers.ts`
  that update state based on events

- **Effects** – Side effect handlers in
  `src/app/core/{domain}/{domain}.effects.ts`, all registered in `allEffects()`
  in `src/app/core/all-effects.ts`:
  - `setColorTheme$` - Theme application via ColorThemeService
  - `loadFont$` - Google font loading via GoogleFontLoaderService
  - `setBackgroundColor$` - Background color updates
  - `colorChanged$` - Theme reaction to a changed converter color
  - `anyPersistableEvents$` - Maps every persistable event to `saveAppState()`
  - `persist$` - State persistence to localStorage

  The navigation effects in `src/app/core/common/navigation.effects.ts` are
  **not** registered: they navigate to the v1 routes, which the router no longer
  answers. Do not put them back before the new screens have shareable ids of
  their own.

### State Domains

State lives in `src/app/core/{domain}/`, divided into four domains. Their shape
is in `src/app/core/models/app-state.model.ts` – read the field list there
rather than duplicating it here.

1. **Converter** – the current color, its display format and color space, and
   the tints and shades derived from it
2. **Palettes** – the current palette, its style, and whether the style is
   rolled. The styles are listed in `PaletteStyles`
   (`src/app/palettes/models/palette-style.model.ts`); `generatePalette()`
   (`src/app/palettes/helper/palette.helper.ts`) hands each to its own
   `*-palette.helper.ts`. Pinned colors survive a regenerate
3. **Contrast** – the text and background pair with its APCA value. The math
   sits in `src/app/contrast/helper/`
4. **Common** – the color theme (light/dark/system) and the selected font

### Screens And Shell

The routed screens do not follow the state domains:

- `src/app/shell/` – `AppHeader` and `ThemeControl`
- `src/app/studio/` – the studio view
- `src/app/contrast-type/` – the contrast and type view

The v1 screens are `src/app/converter/`, `src/app/palettes/components/`,
`src/app/contrast/components/` and `src/app/header/`. They are no longer routed
and no longer reach the bundle; do not extend them and do not build new screens
inside them.

**Only the `components/` folders are v1.** `palettes/helper/`,
`contrast/helper/`, their `models/` and `common/helpers/` are the live
engine – `app-state.model.ts` and `persistence.reducers.ts` call
`generatePalette()` and `paletteFromId()` at startup. Deleting a v1 screen
means deleting its `components/`, never the folder above it.

### Palette ID System

`paletteIdFromPalette()` encodes a palette into 43 characters: one decimal digit
for the style index, then 42 characters of base62 over 31 bytes – 30 RGB bytes
for ten colors (five current, five starting) and one byte for the pinned
bitmask. `paletteFromId()` restores all of it, starting colors included, so a
regenerate picks up where the shared palette left off. The payload is
fixed-length, so the bitmask is always encoded.

**Known limit:** the style index is exactly one decimal digit, so ten styles are <!-- durable-ok -->
the maximum the format can represent. Adding a style beyond that needs a wider
index field first; without one `styleFromPaletteId` falls back to a random
style and says nothing.

The ids are generated and persisted, but no route takes one until the new
screens have shareable urls of their own.

### Contrast ID System

`contrastIdFromColors()` encodes the pair as six RGB bytes in base62, nine
characters fixed. `contrastColorsFromId()` restores both colors and recomputes
the APCA value; `generateRandomContrastColors()` rolls a background and picks a
text color that reads on it. Like the palette id, none of it is routed yet.

### Color Libraries

The app uses two main color libraries:

- **chroma-js** - Primary color manipulation (conversions, interpolation, color
  math)
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
`chroma.hsl()` plus the Bezier interpolation used for tints, shades, and palettes
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
above them, not by a fixed offset.** The accents follow a given base color, so a
light base leaves little room. A fixed offset runs past 1 there, `fromOklch()`
clamps it, and the member comes back as plain white – neither a color nor
distinguishable from its sibling. Express the lift as a share of `1 - baseLight`
and the jitter as a share of the lift.

**A generator passes a base color's lightness through `usableLightness()`
before it builds anything from it.** `maxChroma()` returns 0 at a lightness of 0
and 1, so a pure black or white base gives every member the same black or white
whatever its hue, and a regenerate repeats it unchanged. Both extremes are
reachable: a converter color and a contrast background each arrive as a pinned
`color0`.

### Bundle Budget

The initial budget is 700 kB warning / 800 kB error. It is meant to catch
regressions, so keep it close to the actual size rather than raising it to make
a warning go away - `pnpm build` prints the current initial total.

Do not lower it to the size the app has while the v2 screens are missing: the
v1 screens left the bundle with their routes, and the figure the budget has to
catch is the one after the new screens land.

### Path Aliases

TypeScript path aliases are configured in `tsconfig.json`:

- `@common/*` → `src/app/common/*`
- `@converter/*` → `src/app/converter/*`
- `@header/*` → `src/app/header/*`
- `@shell/*` → `src/app/shell/*`
- `@studio/*` → `src/app/studio/*`
- `@contrast-type/*` → `src/app/contrast-type/*`
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
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural
  directives
- Do NOT use `@HostBinding`/`@HostListener` - use the `host` object in
  decorators
- Do NOT use `ngClass` - use `[class.foo]` bindings
- Do NOT use `ngStyle` - use `[style.foo]` bindings
- Use `NgOptimizedImage` for static images (not inline base64)

### Templates

- Keep templates simple and free of complex logic - move it into a `computed()`
- No arrow functions in templates; they are not supported
- Do not rely on globals such as `new Date()` being available
- The app is signal-based throughout: there are no observables in templates. If
  one ever needs to reach a template, use `toSignal()` from
  `@angular/core/rxjs-interop` rather than the `async` pipe

### Forms

Only template-driven forms are in use:

- `FormsModule` with `ngModel` for every value input - the numeric and text
  fields (RGB, HSL, hex, OKLCH), the sliders, and the font selector typeahead
- `ReactiveFormsModule` is deliberately absent. There is no `FormControl`,
  `FormGroup` or `formControl` binding anywhere in `src`. Do not add the import
  "just in case" - add it only together with an actual reactive control
- Do NOT wrap inputs in a `<form>` element for layout only. An implicit
  `NgForm` breaks `ngModel` registration across component boundaries and
  Angular 22 reports it as NG01354

### Routing

- Routes are declared eagerly in `src/app/app.routes.ts`; there is no lazy
  loading. With two feature routes it would add indirection without benefit
- The router answers three paths: the empty path renders `Studio`, `contrast`
  renders `ContrastType`, and a trailing `**` renders `NotFound`
- Both feature routes carry `pathMatch: "full"`, so an extra segment below one
  of them falls through to the wildcard rather than being ignored
- `withComponentInputBinding()` is active, so route params arrive as component
  `input()`s once the shareable ids come back
- The guards in `src/app/routes/` (`palette-route.guard.ts`,
  `contrast-route.guard.ts`) are no longer in the routing table. They belong to
  the v1 ids and wait there for the new ones
- The SPA rewrite in `public/_redirects` answers every path with `index.html`
  and HTTP 200, so an unknown path cannot produce a real 404 status.
  `NotFound` (`src/app/common/components/not-found/`) makes the miss visible to
  the visitor instead of leaving the viewport blank
- Every route carries a `title`. Angular's `DefaultTitleStrategy` leaves the
  previous title standing when a route has none, so a route without one shows
  the tab title of wherever the visitor came from

**A route opts out of the app header through its `data`.** `App` renders
`AppHeader` unless the activated route carries `data: {appHeader: false}`.
Anything else gets the header, so a new screen needs no entry to be framed
correctly. `app.spec.ts` pins both halves.

No route in the table opts out. A screen may only do so once it carries a
header of its own: without one there is no title, no tabs and no theme
control, and a visitor who arrives on a url the router does not answer has no
way off the page.

### Services

- Use the Angular 22 `@Service()` decorator for singleton services. It is
  auto-provided in the root injector, so `@Injectable({providedIn: 'root'})` is
  no longer needed - there is no `@Injectable` left in `src`
- Use `@Injectable()` only where a class genuinely must not be root-provided (or
  `@Service({autoProvided: false})` and an explicit `providers` entry)
- Use the `inject()` function instead of constructor injection
- Design services around a single responsibility

### TypeScript

- Use strict type checking (`strict`, `strictTemplates`,
  `typeCheckHostBindings`, `noImplicitReturns`, `noImplicitOverride` are all on)
- Prefer type inference when obvious
- Avoid `any` - use `unknown` when type is uncertain
- Use double quotes for strings (`quote_type = double` in `.editorconfig`)
- Import through the path aliases above, never through relative `../../` paths

### Component State

- Use signals for local component state
- Use `computed()` for derived state
- Do NOT use `mutate()` on signals - use `update()` or `set()`
- Keep state transformations pure
- App-wide state goes through the central store, not into component state - see
  the State Management section above and the
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
  work in component-scoped CSS under Tailwind v4, and `@reference` makes it work
  only by triggering a full Tailwind pass per file. Reach the element from the
  template instead, put the host's utilities in `host: {class: "..."}`, or add
  an `@layer components` class to the global stylesheet
- Budget limits: 4kB warning, 8kB error per component (`anyComponentStyle`). The
  budget counts either form, so moving a block out of the decorator does not buy
  room
- Global entry point is `src/styles.css`

### Sizes Are Relative, Never Pixels

Every length a visitor can scale - font size, height, padding, gap, radius,
max-width - comes from Tailwind's own scale (`text-base`, `h-11`, `px-5`,
`gap-7`, `max-w-7xl`), whose values are `rem` and `em`. A pixel length ignores
the browser's font size setting, so a visitor who enlarges text gets a layout
that does not follow.

Do **not** write arbitrary pixel values (`text-[10px]`, `h-[30px]`,
`max-w-[1240px]`) to match a design draft. The drafts are drawn in pixels;
divide by 16 and take the nearest scale step. Hairlines are the exception:
`border` is 1px on purpose, because a border is not text.

### Layouts Are Mobile-First

- The unprefixed utility describes the narrow column; `sm:` and `lg:` widen it.
  Do not write the desktop layout first and walk it back with `max-*:`
- A screen is built responsive from the start. Retrofitting it means changing
  DOM order and pulling grid containers up a level – the part that is no longer
  cheap to change once the screen is in place
- No fixed width or height on anything that holds content. Add `min-w-0` where a
  flex child would otherwise refuse to shrink

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
component stylesheet resolves to nothing in the light theme while working in the
dark one.

**Tailwind scans only `src/app` and `src/index.html`.** `src/styles.css`
imports Tailwind with `source(none)` and names its sources explicitly. Without
that, automatic detection takes the whole repository minus `.gitignore`, and
every Markdown file becomes a content source - the class names this file uses as
counter-examples were compiled into the shipped stylesheet. Add an
`@source` line rather than dropping `source(none)`.

### The Theme Attribute Lives On The Root Element

`ColorThemeService` resolves the three stored states to two and writes
`data-theme="light"` or `"dark"` onto `<html>`. The stylesheet therefore never
sees `"system"`. The `dark:` variant is bound to that attribute through
`@custom-variant`, so `prefers-color-scheme` alone changes nothing - a visitor
who picked a theme keeps it.

### No Sass In New Styles

Tailwind v4 does not run through a preprocessor: the global stylesheet is plain
CSS, and `angular.json` sets `inlineStyleLanguage` and the component schematic
to `css`. The `.scss` files still present belong to v1 screens and go with them;
do not add more.

## Accessibility

This app judges color contrast, so its own interface has to hold up. Nothing
here is checked mechanically: the repository has no ESLint and no axe, and
Vitest with happy-dom sees neither a rendered contrast nor a focus ring. A green
`pnpm test` therefore says nothing about any rule below – they hold by review.
Relative sizes are part of this too, see "Sizes Are Relative, Never Pixels"
above.

`@angular/cdk` is already a dependency, so `A11yModule` and `LiveAnnouncer`
need no new package.

### Interactive Controls Follow The Accessible Minimums

- Text a visitor reads is at least `text-base` (1rem). `text-sm` (0.875rem) is
  for secondary labels, and nothing goes below it
- A control that gets clicked or tapped is at least `h-11` (2.75rem) tall and as
  wide, hit area included – an icon-only button pads a small glyph out to that
  size rather than shrinking the target
- An icon-only control carries an `aria-label`; the icon itself is
  `aria-hidden="true"`

### Color Is Never The Only Carrier Of Information

A pass or fail verdict, a contrast value, a pinned swatch, a selected tab – each
needs text or shape next to the color change. This is the failure the app
measures, and the easiest one to commit while building it.

### A Focus Ring Must Survive An Arbitrary Background

Swatches, tint and shade rows, and the contrast preview carry colors the visitor
picked, so a ring drawn in the `line` or `text` token vanishes as soon as the
color underneath sits at the same lightness. Offset the ring off that surface
(`outline-offset`, or a second ring against `panel`) instead of relying on it to
contrast with the color.

### Chrome On A Visitor Color Takes Its Foreground From APCA

Where a label, value, or icon sits on a color the visitor chose, its foreground
comes from the app's own contrast calculation. A token is only guaranteed
against the six neutral surfaces.

### A Regenerated Result Is Announced

Regenerating a palette, rolling random colors, and switching text against
background all replace content without moving focus, so a screen reader is told
nothing. Announce the outcome through `LiveAnnouncer`.

### A Color Surface Carries Its Name

A swatch a visitor can focus or activate has an accessible name saying which
color it is - `colorName()` already produces the text. Never an unlabelled
block.

## Testing

- Test framework: Vitest, run through the `@angular/build:unit-test` builder
  (`runner: "vitest"`, `tsConfig: tsconfig.spec.json`,
  `buildTarget: :build:testing`)
- DOM environment: happy-dom, picked up from devDependencies - there is no
  explicit environment setting and no `vitest.config.*` in the repo
- Run all tests: `ng test` (or `pnpm test`); `ng test --watch=false` for a
  single run
- Component generation skips test files by default (configured in angular.json
  schematics)
