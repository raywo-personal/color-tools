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
   git clone --recurse-submodules https://github.com/raywo-personal/color-tools.git
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
   
### Update Claude Code agents and skills

1. Update the submodule:
   ```bash
   cd .claude
   git fetch           # get new commits from remote
   git checkout main   # or your default branch
   git pull            # get latest changes
   ```

2. Update the project
   ```Bash
   cd ..
   git status          # shows: .claude has uncommitted changes
   git add .claude
   git commit -m "Update Claude knowledge submodule"
   git push
   ```

### Deployment

The application automatically deploys to Cloudflare Pages when changes are pushed to the main
branch. The workflow `.github/workflows/deploy-to-cloudflare-pages.yml` runs the tests, builds with
the `cloudflare` configuration and uploads `dist/ColorTools/browser` via `wrangler pages deploy`.

It needs two repository secrets: `CLOUDFLARE_API_TOKEN` (permission *Cloudflare Pages: Edit*) and
`CLOUDFLARE_ACCOUNT_ID`. The Cloudflare Pages project must be named `color-tools` and use `main` as
its production branch – both are hardcoded in the workflow's `wrangler pages deploy` call, and a
mismatching production branch would silently create a preview deployment instead. SPA routing is
handled by `public/_redirects`, which rewrites every path to `index.html`.
