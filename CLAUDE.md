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

ColorTools is an Angular 22 web application for color manipulation and analysis, featuring a color converter, a palette generator and a contrast checker. The app uses signals-based state management with @ngrx/signals and deploys to GitHub Pages.

The app is zoneless (`provideZonelessChangeDetection()` in `src/app/app.config.ts`) and fully signal-based. There is no zone.js and no `ChangeDetectionStrategy` annotation anywhere in `src/` - Angular 22 makes OnPush the default.

Live site: https://color-tools.skillbird.de/

## Development Commands

### Basic Commands

- `pnpm install` - Install dependencies
- `pnpm start` - Start dev server (defaults to development configuration)
- `pnpm build` - Build for production
- `pnpm test` - Run tests with Vitest
- `pnpm deploy` - Deploy to GitHub Pages (runs gh-pages build and deploys)

### Build Configurations

The project has four build configurations:

- `production` - Production build with optimization and output hashing
- `gh-pages` - GitHub Pages deployment (same as production but without localization)
- `development` - Dev build with source maps, no optimization
- `testing` - Build target consumed by the `test` target; not meant to be built directly

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

- Manages current color, display format (RGB/HSL/HEX), and color space settings
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
- **color-namer** - Color name identification

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
`angular-development` skill in `.claude/skills/` carries the general Angular
guidance; where the two differ, this file wins because it describes what this
codebase actually does.

### Component Standards

- Keep components small and focused on a single responsibility
- Use standalone components (default, do NOT set `standalone: true`)
- Do NOT set `changeDetection` - OnPush is the Angular 22 default. Setting
  `ChangeDetectionStrategy.Eager` opts out of it and needs a written reason
- Use signals for state management via `signal()`, `computed()`, and `effect()`
- Use `input()` and `output()` functions instead of decorators
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

Both form styles are in use, and that is deliberate:

- `FormsModule` with `ngModel` for the small numeric and text value inputs
  (RGB, HSL, hex, sliders) - this is the dominant pattern
- `ReactiveFormsModule` where a control needs validation or programmatic
  wiring (e.g. the font selector typeahead)
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

### Services

- Use `providedIn: 'root'` for singleton services
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

Components use inline SCSS styles configured in `angular.json`:

- Schematics set `inlineStyle: true` by default. This stays the project
  standard - do not migrate components to separate `.scss` files. The
  `angular-development` skill asks for centralized topic files plus
  component-specific overrides in the component's own style file; here that
  override file *is* the inline `styles` block, so the two agree
- Budget limits: 4kB warning, 8kB error per component (`anyComponentStyle`)
- Global entry point is `src/styles.scss`
- Cross-cutting styles live in `src/app/styles/` as topic-separated partials
  (`_variables.scss`, `_dark-mode.scss`, `_bootstrap-custom.scss`,
  `converter.scss`, `contrast.scss`, `color-palette.scss`, `sliders.scss`,
  `drag-n-drop.scss`)
- Uses Bootstrap 5.3 and Bootstrap Icons

## Testing

- Test framework: Vitest, run through the `@angular/build:unit-test` builder
  (`runner: "vitest"`, `tsConfig: tsconfig.spec.json`, `buildTarget: :build:testing`)
- DOM environment: happy-dom, picked up from devDependencies - there is no
  explicit environment setting and no `vitest.config.*` in the repo
- Run all tests: `ng test` (or `pnpm test`); `ng test --watch=false` for a single run
- Component generation skips test files by default (configured in angular.json schematics)
- The suite currently consists of 138 tests in 4 helper specs (palette ID,
  contrast ID, APCA rating, optimal text color). No component or store is tested
