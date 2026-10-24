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

| Tool                        | What it answers                                                                                                         |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------|
| `describe_color`            | Name, HEX, RGB, HSL and OKLCH of a color, plus the chroma its hue can hold                                              |
| `check_contrast`            | The APCA contrast of a text color on a background and its verdict, at a size and weight, as body copy or spot text      |
| `find_text_color`           | A text color for a background – the strongest, the softest that still passes, or one on the background's hue            |
| `generate_palette`          | A five-color palette on a base color in a given style, with each slot's role, an id and a seed that reproduce it        |
| `read_palette`              | The palette an id from `generate_palette` stands for                                                                    |
| `tints_and_shades`          | Two perceptually even eleven-step ramps from a color, one towards white and one towards black                           |
| `audit_pairs`               | Up to 50 text and background pairs checked against APCA at once, with a suggested text color for every pair that fails  |
| `adjust_color_for_contrast` | The smallest lightness shift of one color in a pair that meets the APCA requirement, keeping its hue                    |
| `simulate_color_vision`     | Colors that appear together as seen under four color-vision deficiencies, and which of them merge                       |
| `export_palette`            | A palette id as CSS, SCSS, Tailwind v4, JSON or W3C design tokens, exactly as the app's export panel copies it          |

The resource `colortools://palette-styles` lists every style
`generate_palette` accepts, with what it does.

There is no session and no authentication: the server holds no state and calls
no paid service.

### Connecting

**Claude.ai** – Customize → Connectors → Add → Add custom connector. Enter a
name and the URL `https://color-tools.skillbird.de/mcp`, choose *No sign in*
under Authentication and leave the request headers empty. Then switch the
connector on per chat under + → Connectors
([custom connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)).

**Claude Code:**

```bash
claude mcp add --transport http colortools https://color-tools.skillbird.de/mcp
```

**VS Code** – in `.vscode/mcp.json`:

```json
{
  "servers": {
    "colortools": {
      "type": "http",
      "url": "https://color-tools.skillbird.de/mcp"
    }
  }
}
```

Any other client that speaks Streamable HTTP takes the same URL.

### Without an MCP client

The server answers a POST with a JSON body, and a single `tools/call` needs no
`initialize` before it. So a CI job can audit a set of design tokens with
`curl` alone. The `Accept` header has to name both types, or the server
answers 406:

```bash
curl -s https://color-tools.skillbird.de/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "audit_pairs",
      "arguments": {
        "pairs": [
          {"label": "body-on-page", "textColor": "#334155",
           "backgroundColor": "#ffffff", "textKind": "bodyCopy"},
          {"label": "button", "textColor": "#ffffff",
           "backgroundColor": "#60a5fa", "fontSize": "14px",
           "fontWeight": "600"}
        ]
      }
    }
  }' | jq -e '.result.structuredContent.failed == 0'
```

`result.structuredContent` holds `passed`, `failed` and one entry per pair;
`jq -e` turns a failing pair into a non-zero exit code. The example fails on
purpose: white on that blue at 14px/600 is short of the requirement.

`/mcp` is rate limited per IP: more than 10 requests within 10 seconds get a
429 for the next 10 seconds. A job that audits more than 50 pairs sends them
in batches with a pause between, rather than in a burst.

## Development

### Prerequisites

- pnpm

`pnpm install` downloads the Node.js that `devEngines.runtime` in
`package.json` declares, and every `pnpm run` and `pnpm exec` uses it,
whatever Node the shell has. Run the tools through pnpm, not through `npx` or
a bare `node`: under Node 26 its own `localStorage` hides happy-dom's and the
app's tests fail.

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

`pnpm run mcp:dev` runs the Worker from `wrangler.jsonc` and serves what
`pnpm run build:cloudflare` produced, so run the build first. The app and the
MCP server then answer under `http://localhost:8787`, the server at `/mcp`.

The Worker is bundled by Wrangler, which resolves imports more strictly than
TypeScript and Vitest do. Before pushing a change under `functions/`, run the
bundle once, after `pnpm run build:cloudflare` – the dry run fails without the
app's build output:

```bash
pnpm exec wrangler deploy --dry-run --outdir /tmp/worker-bundle
```

Conventions for the code are in `CLAUDE.md`.

### Claude Code agents and skills

Agents and skills come from the `rw` plugin (marketplace `raywo-personal`).
Install it once per machine with `/plugin`; nothing about it is stored in this
repository.

## Deployment

The app and the MCP server deploy as one Cloudflare Worker with static assets,
named `color-tools` and configured in `wrangler.jsonc`. The Angular build is
the assets; `functions/worker.ts` is the Worker's entry.

The workflow `.github/workflows/deploy-to-cloudflare.yml` runs on every pull
request against `main` and on every push to it. It lints, runs both test
suites, builds with the `cloudflare` configuration, and type-checks and
bundles the Worker. On a push it then deploys; a pull request stops after the
build.

`wrangler` bundles `functions/` from the working directory at deploy time, so
the deploy job checks out the repository and installs before it downloads the
built app. Without that step the deploy fails to resolve the Worker's imports.

A push to `main` runs `wrangler deploy` and updates production on
<https://color-tools.skillbird.de>, the custom domain `wrangler.jsonc`
declares. There are no previews: neither `workers_dev` nor `preview_urls` is
on, so nothing of the Worker answers on `workers.dev`, outside the zone's
rate limiting rule.

It reads the organisation secret `SKILLBIRD_CLOUDFLARE_API_TOKEN` and the
organisation variable `SKILLBIRD_CLOUDFLARE_ACCOUNT_ID`. The token needs
*Workers Scripts* and *Workers Editor* on the account, and *Workers Routes* on
the `skillbird.de` zone for the custom domain. The deploy that created the
Worker ran with these three.

Routing:

- `/mcp`, `/webfonts` and every path below either reach the Worker first
  through `run_worker_first`
- a path with an asset gets the asset
- every other path gets `index.html` through `not_found_handling:
  "single-page-application"`; the Worker hands what reaches it outside `/mcp`
  and `/webfonts` back to the assets
- `public/_redirects` answers the v1 paths `/convert` and `/palettes` with a
  301 to `/`
- `/webfonts` goes on unchanged to `google-webfonts-proxy` through the
  service binding `FONTS`. The proxy has no route and no `workers.dev` URL;
  the binding is its only entry
- the proxy answers the font catalogue at `/webfonts`, a chosen typeface's
  stylesheet at `/webfonts/css2` and its files at `/webfonts/s/…`, so the
  visitor's browser never contacts Google. The app's own typefaces are files
  under `public/fonts/`, each family beside its licence

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
CLOUDFLARE_API_TOKEN=<token with the permissions listed under Deployment>
```

Every call through the script then talks to this project's account:

```bash
pnpm run cf whoami
pnpm run cf deployments list
```

`.cloudflare.env` is gitignored and has to stay that way – it holds a live API
token.
