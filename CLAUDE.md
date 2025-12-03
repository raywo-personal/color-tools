# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ColorTools is an Angular 21 web application for color manipulation and analysis, featuring a color converter and palette generator. The app uses signals-based state management with @ngrx/signals and deploys to GitHub Pages.

Live site: https://color-tools.skillbird.de/

## Development Commands

### Basic Commands
- `pnpm install` - Install dependencies
- `pnpm start` - Start dev server (defaults to development configuration)
- `pnpm build` - Build for production
- `pnpm test` - Run tests with Karma
- `pnpm deploy` - Deploy to GitHub Pages (runs gh-pages build and deploys)

### Build Configurations
The project has three build configurations:
- `production` - Production build with optimization and output hashing
- `gh-pages` - GitHub Pages deployment (same as production but without localization)
- `development` - Dev build with source maps, no optimization

## Architecture

### State Management

The app uses a centralized state management system built on @ngrx/signals:

- **AppStateStore** (`src/app/core/app-state.store.ts`) - Central signal store configured with:
  - Initial state from `src/app/core/models/app-state.model.ts`
  - Reducers that handle state updates via events
  - Effects that trigger side effects (localStorage persistence, routing, theme changes)

- **Events** - Domain-specific event emitters located in `src/app/core/*/events.ts`:
  - `converterEvents` - Color conversion and manipulation
  - `palettesEvents` - Palette generation and updates
  - `commonEvents` - Theme changes and common actions
  - `persistenceEvents` - State persistence to localStorage

- **Reducers** - Pure functions in `src/app/core/*/reducers.ts` that update state based on events

- **Effects** - Side effect handlers in `src/app/core/*/effects.ts` registered in `all-effects.ts`:
  - State persistence to localStorage
  - Navigation to palette URLs
  - Theme application via ColorThemeService
  - Background color updates

### Application Structure

State is divided into three domains:

1. **Converter** (`src/app/converter/`) - Color conversion and tint/shade generation
   - Manages current color, display format (RGB/HSL/HEX), and color space settings
   - Generates tints and shades using Bezier interpolation when enabled
   - State: `currentColor`, `textColor`, `useAsBackground`, `correctLightness`, `useBezier`, `displayColorSpace`

2. **Palettes** (`src/app/palettes/`) - Color palette generation
   - Eight palette styles: analogous, muted-analog-split, monochromatic, vibrant-balanced, high-contrast, triadic, complementary, split-complementary
   - Each style has a dedicated generator in `src/app/palettes/helper/*-palette.helper.ts`
   - Palettes support pinned colors that remain fixed during regeneration
   - State: `paletteStyle`, `useRandomStyle`, `currentPalette`

3. **Common** (`src/app/common/`) - Shared utilities and theme management
   - State: `colorTheme` (light/dark/system)

### Palette ID System

Palettes can be encoded into shareable URLs via a compact ID system:

- **Encoding** (`paletteIdFromPalette`) - Converts palette to base62-encoded string:
  - First character: style index (0-7)
  - Next 40-42 chars: base62-encoded RGB values for 10 colors (5 current + 5 starting colors)
  - Last byte (optional): bitmask for pinned colors

- **Decoding** (`paletteFromId`) - Restores palette from ID:
  - Extracts style, colors, and pinned state
  - Reconstructs full palette with starting colors for regeneration

This allows palettes to be shared via URL: `/palettes/{paletteId}`

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
- `@core/*` → `src/app/core/*`

Always use these aliases for imports within the codebase.

## Angular Best Practices (from .github/copilot-instructions.md)

### Component Standards
- Use standalone components (default, do NOT set `standalone: true`)
- Use signals for state management via `signal()`, `computed()`, and `effect()`
- Use `input()` and `output()` functions instead of decorators
- Prefer inline templates for tiny components
- Use native control flow (`@if`, `@for`, `@switch`) instead of structural directives
- Do NOT use `@HostBinding`/`@HostListener` - use the `host` object in decorators
- Do NOT use `ngClass` - use `[class.foo]` bindings
- Do NOT use `ngStyle` - use `[style.foo]` bindings
- Use `NgOptimizedImage` for static images (not inline base64)

### Services
- Use `providedIn: 'root'` for singleton services
- Use the `inject()` function instead of constructor injection
- Design services around single responsibility

### TypeScript
- Use strict type checking (enabled in tsconfig)
- Prefer type inference when obvious
- Avoid `any` - use `unknown` when type is uncertain

### State Management
- Use signals for local component state
- Use `computed()` for derived state
- Do NOT use `mutate()` on signals - use `update()` or `set()`
- Keep state transformations pure

## Component Style Guidelines

Components use inline SCSS styles configured in `angular.json`:
- Schematics set `inlineStyle: true` by default
- Budget limits: 4kB warning, 8kB error per component
- Global styles in `src/styles.scss`
- Uses Bootstrap 5.3 and Bootstrap Icons

## Testing

- Test framework: Jasmine + Karma
- Run all tests: `pnpm test`
- Component generation skips test files by default (configured in angular.json schematics)