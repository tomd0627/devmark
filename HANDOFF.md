# Devmark — Handoff

## Current Phase

**Phase 8 complete** — README + recruiter audit

Live URL: https://tomdeluca-devmark.netlify.app/

## What Was Just Completed

### Config files added

- **`eslint.config.js`** — ESLint 9 flat config; `@eslint/js` recommended rules; browser globals for `src/js/**`, Node 18+ globals (+ explicit Web API polyfills) for `netlify/functions/**`
- **`.stylelintrc.json`** — extends `stylelint-config-standard`; `stylelint-order` plugin loaded; overrides: `color-function-notation: legacy` (keep `rgba()`), `alpha-value-notation: number`, `keyframes-name-pattern: null`, `custom-property-pattern: null`, `selector-class-pattern: null` (BEM uses `__`/`--`)
- **`.prettierrc`** — `singleQuote: true`, `semi: true`, `tabWidth: 2`, `printWidth: 100`, `trailingComma: "all"`
- **`.prettierignore`** — excludes `node_modules/`, `public/fonts/`, `.netlify/`
- **`.husky/pre-commit`** — runs `npx lint-staged` on every commit
- `"prepare": "husky"` added to `package.json` scripts by `husky init`

### CSS fixes made during lint pass

- `src/css/reset.css` — removed `-webkit-text-size-adjust` (flagged by `property-no-vendor-prefix`; `text-size-adjust` on the next line covers Safari 17+)
- `src/css/typography.css` — `font-family: "Inter"` → `font-family: Inter` (single-word names must be unquoted per `font-family-name-quotes`)
- `src/css/layout.css` + `src/css/components/sidebar.css` — all `(min-width: X)` media queries converted to `(width >= X)` (modern context notation per `media-feature-range-notation`)

### package.json script fixes

- `lint:js` — changed from `eslint 'src/js/**/*.js'` to `eslint src/js netlify/functions` (covers the Netlify function + avoids single-quote literal passing on Windows/cmd.exe)
- `lint:css` — removed single quotes around glob (`stylelint src/css/**/*.css`) for same reason

### Verified clean

```
npm run lint:js     ✓
npm run lint:css    ✓
npm run format:check ✓
```

## Lighthouse Results (Phase 7)

Audited against local `npx serve .` on port 3000:

- Performance: **99** (target ≥90) ✓
- Accessibility: **100** (target ≥95) ✓
- Best Practices: **100** ✓
- SEO: **100** ✓

Three "insight" audits flagged but all non-actionable: cache headers (dev server artifact — Netlify headers already configured), preconnect (no external origins — all assets self-hosted), render-blocking CSS (no build tool by design; score still 99).

## Recruiter Audit Fixes (Phase 8)

- `escapeHtml` removed from `utils.js` — was exported but never imported (dead code)
- `summarise` → `summarize` throughout `api.js` and `form.js` — British spelling was inconsistent with rest of codebase and endpoint name
- `document.querySelector` → `qs()` in `main.js` — inconsistent with project's own helper
- `README.md` written from scratch — full setup, env var, local dev, deployment, security notes

## Exact Next Task

Project is complete. All phases shipped.

## Possible Post-Completion Work

- Custom domain (add CNAME in Netlify + update CSP `connect-src` if needed)
- Export bookmarks as JSON/CSV
- Bulk delete or bulk re-tag

## All Decisions Made

### Phase 2

- Palette: amber (`#F0A500`) on near-black (`#111012`)
- Fonts: Inter Variable + JetBrains Mono Variable, self-hosted woff2
- No `_redirects` — single page, `netlify.toml` handles everything
- Netlify Functions v2 (ESM `export default`), `node_bundler = "esbuild"`

### Phase 3

- Function returns `{ url, title, summary, tags }` — `url` is canonical after redirects
- Favicon: `${origin}/favicon.ico`, `onerror` → `/public/favicon.svg`, no external service
- Card actions: copy URL + delete (title link already opens in new tab)
- Filter state: module-level in `bookmarks.js`; adding resets to "all"
- Tag sorting: by frequency desc, then alpha

### Phase 4

- Stylelint: BEM naming (`__`/`--`) allowed via `selector-class-pattern: null`; modern color functions not enforced
- Media queries: converted to modern `(width >= X)` notation
- npm scripts: no single quotes (Windows cmd.exe compatibility)

## Known Gotchas

- CSS uses absolute paths for fonts (`/public/fonts/...`) — requires `netlify dev` or `npx serve .`, not `file://`
- `netlify.toml` has `targetPort = 3000` in `[dev]` — remove if `netlify dev` complains about no process on port 3000
- Header height ~57 px — `inset-block-start: 57px` in `sidebar.css` must stay in sync if header height changes

## To Resume

"Read CLAUDE.md and HANDOFF.md, then continue from where we left off."
