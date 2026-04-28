# Devmark

An AI-powered bookmark manager. Paste a URL and Claude automatically fetches the page, generates a concise summary, and applies relevant tags. Bookmarks are stored in `localStorage` — no account or backend database required.

---

## Features

- Paste any public URL to save it as a tagged, summarized bookmark
- Filterable tag sidebar (desktop) and tag cloud (mobile)
- Copy URL and delete actions on every card
- Persistent storage via `localStorage` — survives page reloads
- Graceful error handling for unreachable URLs, scraping blocks, and API failures
- Fully responsive across mobile, tablet, and desktop

## Tech stack

| Layer          | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| Frontend       | Vanilla HTML / CSS / JS (ES modules, no build step)          |
| AI             | Claude Haiku via [Anthropic API](https://docs.anthropic.com) |
| Function proxy | Netlify Functions v2 (ESM, esbuild bundler)                  |
| Fonts          | Inter Variable + JetBrains Mono Variable, self-hosted woff2  |
| Linting        | ESLint 9 + Stylelint 16 + Prettier 3 + Husky pre-commit      |

## Project structure

```
├── index.html
├── netlify.toml              # Build config, function config, security headers
├── netlify/
│   └── functions/
│       └── summarize.js      # Claude proxy — never exposes the API key client-side
├── public/
│   ├── fonts/                # Self-hosted variable fonts
│   ├── icons/
│   │   └── sprite.svg        # Inline SVG icon sprite
│   └── favicon.svg
└── src/
    ├── css/
    │   ├── tokens.css        # Design tokens (palette, type scale, spacing)
    │   ├── reset.css
    │   ├── typography.css    # @font-face declarations
    │   ├── layout.css        # App shell, header, two-column grid
    │   ├── utilities.css     # sr-only, focus ring, reduced-motion
    │   └── components/       # card, form, sidebar, dialog, toast
    └── js/
        ├── main.js           # Entry point — wires modules together
        ├── api.js            # fetch wrapper for the Netlify function
        ├── store.js          # localStorage read/write
        ├── bookmarks.js      # Card DOM rendering
        ├── tags.js           # Tag sidebar and mobile cloud rendering
        ├── form.js           # Form submit, loading state, error dispatch
        ├── ui.js             # Toast, dialog, ARIA announcer
        └── utils.js          # qs, formatDate, generateId, normalizeUrl
```

## Local development

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
git clone https://github.com/tomd0627/devmark.git
cd devmark
npm install
```

Create a `.env` file at the project root (never commit this):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Running locally

The app uses absolute font paths (`/public/fonts/…`) so it must be served — opening `index.html` directly via `file://` will not work.

**Option A — Netlify CLI** (recommended; runs the function locally too):

```bash
npx netlify dev
```

The site will be available at `http://localhost:8888`. The `ANTHROPIC_API_KEY` from `.env` is automatically injected into the function.

**Option B — static server** (UI only; function calls will fail without the proxy):

```bash
npx serve . -p 3000
```

## Deployment

This project is designed for Netlify. Configuration is in `netlify.toml`.

1. Push the repo to GitHub.
2. In the [Netlify dashboard](https://app.netlify.com), create a new site and import the GitHub repository. Build settings are auto-detected from `netlify.toml` — no build command, publish directory is `.`.
3. Go to **Site configuration → Environment variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
   - Scope: Functions
4. Trigger a new deploy so the function picks up the environment variable.

## Environment variables

| Variable            | Required | Description                                                                    |
| ------------------- | -------- | ------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Yes      | Anthropic API key. Set in Netlify dashboard — never commit to version control. |

## Linting and formatting

```bash
npm run lint:js       # ESLint
npm run lint:css      # Stylelint
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
```

A Husky pre-commit hook runs `lint-staged` automatically on every commit, applying ESLint, Stylelint, and Prettier to staged files.

## Security

- The Anthropic API key is only ever accessed server-side inside the Netlify Function — it is never sent to the browser.
- The function validates URLs against a blocklist of private IP ranges (RFC 1918, loopback, link-local) to prevent SSRF.
- HTTP response headers are set in `netlify.toml`: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
