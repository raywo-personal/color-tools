# CLAUDE.md

Guidance for coding agents working in this repository. `AGENTS.md` in the
repository root is a symlink to this file, so any agent that looks for either
name reads the same content.

Rules here say what to do and, where a plausible mistake is at stake, why. The
longer story behind a rule sits as a comment at the place in the code that it
protects – read it there, and put a new one there too.

## Questions Are Not Work Orders

- A question asks for an answer, not for a change. Diagnose the cause, explain
  the reasoning, name the options, recommend one – then stop.
- Editing files, adding or removing dependencies, running migrations and
  committing require an explicit instruction to do it, however obvious or small
  the change looks.
- Reading files, searching the codebase, and running read-only commands is
  always fine.

## Project Overview

ColorTools is an Angular 22 web application for color manipulation and
analysis: a color studio and a contrast checker. State is a signal store on
@ngrx/signals, the app is zoneless, and it deploys to Cloudflare Pages together
with an MCP server on the same colour engine.

Live site: https://color-tools.skillbird.de/

## Commands

The README lists the everyday commands. The ones with a catch:

- `pnpm lint` – ESLint plus `tools/lint-sizes.js`. Both halves always run and
  the exit codes are combined; do not join them with `&&`, or a sizing finding
  hides behind the first ESLint one
- `pnpm test` – the app's specs under `src/**`, through
  `@angular/build:unit-test` with Vitest and happy-dom; `pnpm run test:ci` for
  a single run
- `pnpm run mcp:test` – the MCP server's specs under `functions/**`, through
  `vitest.config.mcp.ts` in node. The two runs do not overlap
- `pnpm run mcp:dev` – serves `dist/` plus the MCP server; needs a
  `pnpm run build:cloudflare` first
- `pnpm run cf <args>` – wrangler against this project's account; sources the
  untracked `.cloudflare.env`
- `npx wrangler pages functions build --outdir <tmp>` – the only local run
  that resolves the Worker's imports the way the deploy does (see "MCP
  Server")

## Claude Code Agents And Skills

Skills and agents come from the `rw` plugin (marketplace `raywo-personal`,
repository `raywo-personal/claude-agents-and-skills`), installed per user.
Nothing under `.claude/` is committed. The plugin is shared across projects, so
a convention that only holds for ColorTools goes in this file – and this file
wins where the two differ.

## Writing Text For GitHub

Anything GitHub renders as HTML is **not** hard-wrapped – its UI wraps, and a
hard wrap produces ragged paragraphs and breaks quoting. One paragraph is one
line; break only between paragraphs, per list item, per table row, and around
code blocks. This covers issue bodies and comments, PR descriptions, review
comments, replies, and release notes.

Hard-wrapping stays where text is read in monospace without reflow: commit
messages (subject at most 50 characters, body at 72), files in this repository
including this one, and code comments.

## Map

- `src/engine/` – the colour engine: `color/`, `contrast/`, `palette/`, and
  `helpers/` for what serves all three, each model beside the code that uses
  it. Plain TypeScript on chroma-js and color-namer's lists
- `src/app/core/` – the store: `app-state.store.ts`, the state shape in
  `models/app-state.model.ts`, and per domain (`converter`, `palettes`,
  `contrast`, `common`) an `*.events.ts`, `*.reducers.ts` and `*.effects.ts`.
  `all-effects.ts` is the list of registered effects; read it rather than a
  copy here
- `src/app/shell/`, `src/app/studio/`, `src/app/contrast-type/` – the routed
  screens, declared in `app.routes.ts`
- `src/app/common/` – shared components, services and the four app models
- `src/testing/` – test helpers, reachable as `@testing/*`
- `functions/mcp/` – the MCP server, a Cloudflare Pages Function
- `tools/v1-screens.js` – the v1 code, excluded from lint. It is no longer
  routed and no longer reaches the bundle; do not extend it and do not build
  new screens inside it

Path aliases are declared in `tsconfig.json`, one per top-level folder. Import
through them, never through relative `../../` paths.

## The Engine

- The engine imports chroma-js, color-namer's lists and itself. Nothing from
  `@angular/*`, `@ngrx/*` or `@core/*`: the Worker bundle takes whatever the
  engine imports
- The app and the MCP server reach it through `@engine/*` alone
- It stays under `src/`. `@angular/build:unit-test` resolves its `include`
  relative to `sourceRoot`, so a folder beside `src/` would need its own
  include patterns in both tsconfigs
- `colorName()` imports the six `color-namer/lib/colors/*` lists, never the
  package's entry point; the comment on `LISTS` in
  `src/engine/color/color-name.helper.ts` says why. The lists are CommonJS:
  declared in `src/engine/color-namer-lists.d.ts`, listed in
  `allowedCommonJsDependencies` in `angular.json`
- `colorName()` measures from `color.hex()`, not from the `Color` object, and
  stays synchronous – reducers and guards call it. `color-name.helper.spec.ts`
  pins the first
- Palette generators build colors with `fromOklch()`, not `fromHsl()`; equal
  HSL lightness is not equal perceived lightness. `fromOklch()` clamps chroma
  per hue and never levels it to a common floor. HSL constants do not port
- A generator lifts a member that sits lighter than the accents by a share of
  the room above them, not by a fixed offset, and passes the base lightness
  through `usableLightness()` first. The reasons are on both functions
- A generator draws its jitter through `randomBetween()`, never `Math.random`
  or `chroma.random()`: the roll is a seed in the state, and a draw outside
  the seed makes the palette flicker while a color is dragged

### Shareable Ids

`paletteIdFromPalette()` and `contrastIdFromColors()` encode a palette and a
contrast pair into fixed-length base62 ids; their helpers document the layout.
The ids are generated and persisted, but no route takes one until the new
screens have shareable urls of their own. The guards in `src/app/routes/` and
the navigation effects in `core/common/navigation.effects.ts` wait for that and
are not registered.

**The palette id has room for ten styles.** The style index is one decimal <!-- durable-ok -->
digit; a style beyond that needs a wider index field first, or
`styleFromPaletteId` falls back to a random style and says nothing.

## The Store

- App-wide state goes through the store, not into component state
- The palette is built on the current color and follows it live:
  `paletteFollowsColorReducer` rebuilds it on every color event and is
  registered after the converter's reducers, because it reads the color from
  the state. Keep that order
- Picking a style draws a new `paletteSeed`; a color change keeps it
- What a palette slot is *for* is `roleCaptionFor()`, a function of style and
  slot, not a field on `PaletteColor`: a field would travel into the palette
  id, whose payload is full

## Angular Conventions

The `angular-development` skill carries the general guidance; where the two
differ, this file wins because it describes what this codebase does.

- Standalone is the default: do not set `standalone: true`. OnPush is the
  default: do not set `changeDetection`. `ChangeDetectionStrategy.Eager` needs
  a written reason
- `signal()`, `computed()`, `effect()`; `input()`, `output()`, `model()`;
  `viewChild()`, `contentChild()` – no decorators. A property holding a signal
  is `readonly`
- `model()` already provides its `xChange` output; do not add a manual one
- `@Service()` for singletons, `inject()` over constructor injection.
  `@Injectable()` only where a class must not be root-provided
- Native control flow; `[class.foo]` and `[style.foo]` bindings, no `ngClass`
  or `ngStyle`; the `host` object, no `@HostBinding`/`@HostListener`;
  `NgOptimizedImage` for static images
- Templates hold no logic – move it into a `computed()`. No arrow functions,
  no globals such as `new Date()`, no observables: `toSignal()` where one must
  reach a template
- Forms are template-driven: `FormsModule` with `ngModel`. `ReactiveFormsModule`
  arrives only together with an actual reactive control. No `<form>` element
  for layout: the implicit `NgForm` breaks `ngModel` registration across
  component boundaries (NG01354)
- Routes are eager, every route carries a `title` (Angular leaves the previous
  one standing otherwise), feature routes carry `pathMatch: "full"`, and the
  router already binds route params to component inputs
- A route opts out of the app header through `data: {appHeader: false}`, and
  only on `NotFound`'s terms: it has to carry a way off the page itself.
  `app.spec.ts` and `not-found.spec.ts` pin both
- Double quotes, strict TypeScript, `unknown` over `any`

## Styles

Tailwind CSS v4 is the only styling framework. Utilities go in the template;
a component's own style file stays minimal or empty. No Sass in new styles.

- No `@apply` and no `@reference` in component styles. Reach the element from
  the template, put the host's utilities in `host: {class: "..."}`, or add an
  `@layer components` class to `src/styles.css`
- The component style budget counts inline and file alike; moving a block out
  of the decorator buys no room
- **Sizes are relative, never pixels.** Every length a visitor can scale comes
  from Tailwind's scale. The drafts are drawn in pixels: divide by 16 and take
  the nearest step. `border` is the one hairline that stays 1px
- **Layouts are mobile-first.** The unprefixed utility is the narrow column,
  `sm:` and `lg:` widen it; no `max-*:` variants. No fixed width or height on
  anything that holds content; `min-w-0` where a flex child refuses to shrink
- **The six neutral tokens are the whole palette** – `bg`, `panel`, `text`,
  `dim`, `line`, `field`. The token flips with the theme, so write `bg-panel`,
  never `bg-white dark:bg-neutral-900`. There is no accent color; the only
  saturated color on screen is the one the visitor works on. `danger` and
  `on-danger` belong to the failed copy alone
- The dark neutrals keep their OKLch lightness distance from `bg`; move `bg`
  and the others move with it. `@theme` is `static` and Tailwind scans only
  `src/app` and `src/index.html` through `source(none)` – `src/styles.css`
  says why for both. Add an `@source` line rather than dropping `source(none)`
- The theme attribute lives on `<html>` as `data-theme="light"` or `"dark"`,
  written by the boot script in `src/index.html` before the first paint and
  by `ColorThemeService` afterwards. **Critical CSS inlining stays off**: it
  would inline the light theme only, and `boot-theme.spec.ts` fails on any
  configuration that turns it back on

`tools/lint-sizes.js` enforces the sizes, the mobile-first variant, the type
floor and the ring offset; plain CSS in a component `.css` is not covered.

## Linting

`eslint.config.js` is CommonJS on purpose – package.json declares no `type`.
Its comments say which convention each rule mirrors.

- **Linting is not type-aware.** A rule that needs type information fails the
  whole run with a parser error. Turning it on is a separate decision and slows
  `pnpm lint` down by roughly an order of magnitude
- Double quotes come from `@stylistic/eslint-plugin`; ESLint core drops its
  own `quotes` in v11
- A leading underscore marks a binding that only holds a position; the idiom
  needs no disable comment
- `tools/v1-screens.js` is the one list of v1 code, read by both halves of
  `pnpm lint`. Remove an entry together with the folder it names. The v1
  widgets under `common/components/` are listed one by one, so the next v2
  component written there is linted rather than swallowed

## MCP Server

`functions/mcp/` is deployed as a Cloudflare Pages Function beside the app and
served under `/mcp` on the app's origin, preview branches included.

### Layout

- `functions/mcp/[[path]].ts` is the entry and knows only Pages: it hands the
  request to `handleMcpRequest()`. Swapping the host means replacing this file
- `functions/mcp/server.ts` holds `createMcpServer()`, which registers every
  tool, and `handleMcpRequest()`, which wraps it in the HTTP transport. Keep
  them separate: the tests connect the server to an in-memory transport
- One file per tool under `functions/mcp/tools/`, exporting
  `register<Tool>(server)`
- `functions/mcp/helper/` holds what more than one tool asks for: the hex
  input with its one wording, the font size and weight inputs. A schema one
  tool uses stays in that tool's file
- `functions/mcp/test-support/` is for the specs alone; nothing the entry
  imports reaches it, so it never enters the Worker bundle
- `functions/tsconfig.json` extends the root config and includes
  `src/engine/color-namer-lists.d.ts`

### The Fence

`functions/**` imports the engine through `@engine/*` and nothing else from
`src/`. `eslint.config.js` reads the aliases from `tsconfig.json` and forbids
every one but `@engine/*`, plus `@angular/*`, `@ngrx/*` and any relative path
into `src/`; a new alias is fenced the moment it is declared. Anything past the
fence drags an Angular runtime into a Worker that cannot use it.

`@modelcontextprotocol/sdk` and `zod` are runtime dependencies of the Worker
and sit in `dependencies`. Nothing in `src/app` imports them; do not add an
import there to share a schema.

### Stateless, Streamable HTTP Only

Every request gets a new `McpServer` and a new
`WebStandardStreamableHTTPServerTransport` without a session id. No Durable
Object, no `agents` SDK, no SSE transport. `enableJsonResponse: true` makes a
POST answer with a JSON body, so a stateless server loses nothing and the
response reads with `curl`. The transport answers the HTTP half of the protocol
itself, so the entry does no routing.

### Every Tool Is Read-Only And Typed

- Names in `snake_case`, `annotations.readOnlyHint: true`
- A Zod `inputSchema` as a raw shape, not `z.object()`; hex inputs go through
  `isHex()`, lists carry a size cap
- An `outputSchema`, and the result carries the same object as
  `structuredContent` – the SDK rejects a declared schema without content, so
  every call fails, not just the validation
- `content` holds one text block: a sentence the assistant can quote. The
  numbers are in `structuredContent`; do not repeat them in the text
- **`NaN` never reaches `structuredContent`.** chroma-js reports a grey's hue
  as `NaN`, which JSON cannot carry. A field that can be undefined for some
  colours is `nullable()` in the schema and `null` in the result

### SDK Imports Carry The `.js` Suffix

`import ... from "@modelcontextprotocol/sdk/server/mcp.js"` – with the
extension. The SDK's exports map adds nothing, so esbuild in Wrangler cannot
resolve the bare path while TypeScript and Vitest resolve it silently. Only
`npx wrangler pages functions build --outdir <tmp>` catches the omission before
the deploy does.

There is no `nodejs_compat` flag and no `wrangler.jsonc`; add either only when a
bundle actually asks for it.

### Tests And Deploy

- A tool is tested the way Claude calls it: `connectedClient()` links an SDK
  `Client` to `createMcpServer()` in memory and the spec calls
  `client.callTool()`. `server.spec.ts` covers the HTTP half
- **Pin behaviour, not colours.** Assert determinism, roles, round trips and
  shapes – never a concrete hex value a retuned generator would change
- The deploy job checks out and installs before it downloads the built app,
  because `wrangler pages deploy` bundles `functions/` from the working
  directory. Without that step the deployment succeeds and `/mcp` answers
  with the SPA's `index.html`

## Accessibility

This app judges color contrast, so its own interface has to hold up. Each rule
says how it is held: **Lint** through `angular-eslint`'s accessibility preset
and `tools/lint-sizes.js`, **Test** through a helper in `src/testing/`,
**Review** where only rendered pixels or judgement can tell. A green `pnpm test`
and a green `pnpm lint` say nothing about the review-only rules. `@angular/cdk`
is already a dependency, so `LiveAnnouncer` needs no new package.

- **Type floor (Lint).** Text is at least `text-base`; `text-sm` is for
  secondary labels and nothing goes below it, in any spelling
- **Hit area (Review).** A control that gets clicked or tapped is at least
  `h-11` tall and as wide; an icon-only button pads the glyph out to that size
- **Accessible name (Review).** An icon-only control carries an `aria-label`,
  the icon is `aria-hidden="true"`. A swatch a visitor can focus or activate is
  named with `colorName()`. `valid-aria` checks the attribute it finds, not the
  one that is missing
- **Color is never the only carrier (Review).** A verdict, a value, a pinned
  swatch, a selected tab each needs text or shape beside the color. Where a
  carrier exists, a spec pins its value, as `theme-control.spec.ts` and
  `app-header.spec.ts` do. Whether the carrier says anything is the review
- **Focus ring offset (Lint for the offset, Review for visibility).** A
  focusable element binding a visitor color carries `outline-offset-*` or
  `ring-offset-*` in its own class list; a ring in a token vanishes on a color
  of the same lightness. The check reads one element at a time, so put the
  utility on the element itself
- **Copying goes through `CopyService` (Review).** `copyColor()` or
  `copyText()`, never `navigator.clipboard` directly: the service writes,
  confirms through the shell's toast and announces. A failure is not a success
  with other wording – it stands longer, carries the `danger` pair, a sign and
  a semibold message; `copy.service.spec.ts` pins the durations and
  `copy-confirmation.ts` says why the weight
- **`role="list"` on every announced list (Review).** Tailwind's Preflight
  removes the list style and Safari with VoiceOver then stops treating the
  element as a list. On the element itself, or in `host` where the selector is
  the list. A list a spec already renders gets the role pinned there
- **A regenerated result is announced (Test).** Regenerating, rolling random
  colors and switching text against background replace content without moving
  focus. Announce through `LiveAnnouncer` and pin it with
  `provideFakeLiveAnnouncer()` from `@testing/live-announcer.fake`. The
  politeness is part of the assertion; `color-controls.spec.ts` is the worked
  example
- **Chrome on a visitor color takes its foreground from APCA (Test).** A token
  is only guaranteed against the six neutral surfaces. `expectApcaForeground()`
  from `@testing/apca-foreground.expectation` pins it, `swatch.spec.ts` is the
  worked example. The assertion is the maximum, not the threshold – on a
  mid-lightness color neither black nor white reaches it

## Testing

- Component generation skips test files (`angular.json` schematics)
- Test helpers live in `src/testing/`, reachable as `@testing/*` and excluded
  in `tsconfig.app.json`. The exclusion does not stop an import – TypeScript
  follows it and ships `vitest` with the app – so `pnpm lint` forbids it
  outside the specs

## Bundle Budget

The initial budget in `angular.json` is there to catch regressions. Keep it
close to the actual size rather than raising it to make a warning go away, and
do not lower it to the size the app has before the v2 screens have all landed:
the v1 screens left the bundle with their routes, and the figure the budget has
to catch is the one after the new screens are in.
