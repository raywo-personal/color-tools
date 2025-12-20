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

- Node.js 22 or higher
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

The application automatically deploys to GitHub Pages when changes are pushed to the main branch.
