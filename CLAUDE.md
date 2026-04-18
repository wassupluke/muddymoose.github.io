# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run lint          # lint HTML, CSS, and JS
pnpm test              # run Playwright E2E tests (headless Chromium)
pnpm exec serve . -l 3000  # local dev server on port 3000
```

CI (`.github/workflows/ci.yml`) runs lint then tests on every push/PR to `main`. It starts a `serve` process on port 3000 before running Playwright.

## Architecture

Single-page static site — a bakery order form. No framework, no build step.

- `index.html` — the entire page structure (order form)
- `styles.css` — responsive styling with dark mode (system preference + localStorage toggle)
- `script.js` — form logic and interactivity
- `tests/order-form.spec.js` — Playwright E2E tests against `http://localhost:3000`

Payment QR codes (`venmo-qr.png`, `zelle-qr.png`) are embedded directly in the repo.

Linting is configured via `.eslintrc.json` (JS), `.stylelintrc.json` (CSS), and `.htmlhintrc` (HTML).

CSS rules must never have multiple declarations on a single line — stylelint enforces `declaration-block-single-line-max-declarations: 1`.
