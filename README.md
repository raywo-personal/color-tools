# Color Tools

A powerful web application for color manipulation and analysis. This tool helps designers, developers, and artists work with colors efficiently.

## Features

- Color picker with various input formats (HEX, RGB, HSL)
- Color name identification
- Color palette generation
- Color contrast checker
- Accessibility compliance testing
- Color shade and tint generation

## Use it Online

Try it out here: https://color-tools.skillbird.de/

## Quick Start

1. Visit the application URL
2. Use the color picker to select your desired color
3. Explore different color tools and features
4. Copy or export your results

## Development Setup

### Prerequisites

- Node.js 24 (the Angular 22 CLI requires `^22.22.3 || ^24.15.0 || >=26.0.0`)
- pnpm package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/raywo-personal/color-tools.git
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development server:
   ```bash
   pnpm start
   ```

4. Build for production:
   ```bash
   pnpm build
   ```
   
### Claude Code agents and skills

Agents and skills come from the `rw` plugin (marketplace `raywo-personal`).
Install it once per machine with `/plugin`; nothing about it is stored in this
repository.

### Deployment

The application automatically deploys to Cloudflare Pages when changes are pushed to the main
branch. The workflow `.github/workflows/deploy-to-cloudflare-pages.yml` runs the tests, builds with
the `cloudflare` configuration and uploads `dist/ColorTools/browser` via `wrangler pages deploy`.

It needs two repository secrets: `CLOUDFLARE_API_TOKEN` (permission *Cloudflare Pages: Edit*) and
`CLOUDFLARE_ACCOUNT_ID`. The Cloudflare Pages project must be named `color-tools` and use `main` as
its production branch – both are hardcoded in the workflow's `wrangler pages deploy` call, and a
mismatching production branch would silently create a preview deployment instead. SPA routing is
handled by `public/_redirects`, which rewrites every path to `index.html`.

#### Running wrangler locally

`wrangler` is a devDependency, so `pnpm exec wrangler …` works without a global install.

Wrangler takes the Cloudflare account from the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`
environment variables, and a token takes precedence over whatever `wrangler login` stored globally.
That matters when you work with more than one Cloudflare account. A `.env` file does *not* help
here: wrangler reads `.env` only for Worker variables, never for its own credentials.

The `cf` script solves this per project. Create an untracked `.cloudflare.env` in the repository
root:

```
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_API_TOKEN=<token with Cloudflare Pages: Edit>
```

Every call through the script then talks to this project's account:

```bash
pnpm run cf whoami
pnpm run cf pages deployment list --project-name=color-tools
```

`.cloudflare.env` is gitignored and has to stay that way – it holds a live API token.
