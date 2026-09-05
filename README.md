# Color Tools

A web application for working with color: pick one, read it in every format,
build a palette on it, and check how text reads on it. The same colour engine
is available to AI assistants as an MCP server on the same origin.

Use it online: https://color-tools.skillbird.de/

## Screens

- **Studio** – the current color with its name and its HEX, RGB, HSL and OKLCH
  values, sliders to adjust it, tints and shades, and a palette that follows
  the color live in a choice of styles. Everything copies or exports as text
- **Contrast & Type** – a text and background pair judged with APCA, including
  the font size and weight the contrast has to carry

## MCP Server

The colour engine is exposed under `/mcp` on the app's origin as a stateless
Streamable HTTP server: `https://color-tools.skillbird.de/mcp`. Every tool is
read-only.

| Tool              | What it answers                                                                                              |
|-------------------|--------------------------------------------------------------------------------------------------------------|
| `describe_color`  | Name, HEX, RGB, HSL and OKLCH of a color, plus the chroma its hue can hold                                   |
| `check_contrast`  | The APCA contrast of a text color on a background, at a font size and weight, with the verdict               |
| `find_text_color` | A text color for a background – the strongest, the softest that still passes, or one on the background's hue |

Connect it from Claude Code:

```bash
claude mcp add --transport http colortools https://color-tools.skillbird.de/mcp
```

Any MCP client that speaks Streamable HTTP works the same way; there is no
session and no authentication.

## Development

### Prerequisites

- Node.js 24 (the Angular 22 CLI requires `^22.22.3 || ^24.15.0 || >=26.0.0`)
- pnpm

### Commands

```bash
pnpm install               # install dependencies
pnpm start                 # dev server
pnpm test                  # the app's tests, in watch mode
pnpm run test:ci           # the app's tests, single run
pnpm run mcp:test          # the MCP server's tests
pnpm lint                  # ESLint plus the sizing check
pnpm build                 # production build
pnpm run build:cloudflare  # the build the deployment ships
pnpm run mcp:dev           # app plus MCP server locally, from dist/
```

`pnpm run mcp:dev` serves what `pnpm run build:cloudflare` produced, so run the
build first. The MCP server then answers under `http://localhost:8788/mcp`.

The MCP server is bundled by Wrangler, which resolves imports more strictly
than TypeScript and Vitest do. Before pushing a change under `functions/`, run
the bundle once:

```bash
npx wrangler pages functions build --outdir /tmp/mcp-bundle
```

Conventions for the code are in `CLAUDE.md`.

### Claude Code agents and skills

Agents and skills come from the `rw` plugin (marketplace `raywo-personal`).
Install it once per machine with `/plugin`; nothing about it is stored in this
repository.

## Deployment

The workflow `.github/workflows/deploy-to-cloudflare-pages.yml` runs on every
pull request and on every push to `main` or `redesign-v2`. It lints, runs both
test suites, type-checks and bundles the MCP server, and builds with the
`cloudflare` configuration. On a push it then deploys `dist/ColorTools/browser`
with `wrangler pages deploy`; a pull request stops after the build.

The deploy takes `functions/` along as a Pages Function, which is how `/mcp`
reaches the same origin as the app. `wrangler` bundles it from the working
directory at deploy time, so the deploy job checks out the repository and
installs before it downloads the built app.

The deploy hands `wrangler` the branch it was triggered on, and the Pages
project uses `main` as its production branch. A push to `main` therefore
updates production; every other branch in the trigger list lands as a preview
under its own alias – `redesign-v2` is served at
<https://redesign-v2.color-tools-5hv.pages.dev>. Changing the production branch
in the Cloudflare dashboard would silently demote `main` to a preview, so leave
it where it is.

It needs two repository secrets: `CLOUDFLARE_API_TOKEN` (permission *Cloudflare
Pages: Edit*) and `CLOUDFLARE_ACCOUNT_ID`. The Pages project must
be named `color-tools`; the name is hardcoded in the workflow's deploy call.
SPA routing is handled by `public/_redirects`, which rewrites every path to
`index.html`; Functions run before static assets, so the rewrite never reaches
`/mcp`.

### Running wrangler locally

`wrangler` is a devDependency, so `pnpm exec wrangler …` works without a global
install.

Wrangler takes the Cloudflare account from the `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN` environment variables, and a token takes precedence over
whatever `wrangler login` stored globally. That matters when you work with more
than one Cloudflare account. A `.env` file does *not* help here: wrangler reads
`.env` only for Worker variables, never for its own credentials.

The `cf` script solves this per project. Create an untracked `.cloudflare.env`
in the repository root:

```
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_API_TOKEN=<token with Cloudflare Pages: Edit>
```

Every call through the script then talks to this project's account:

```bash
pnpm run cf whoami
pnpm run cf pages deployment list --project-name=color-tools
```

`.cloudflare.env` is gitignored and has to stay that way – it holds a live API
token.
