# Portfolio

Personal portfolio and digital studio: web development, software solutions, business automation and integrations.

**Status:** deployed on Vercel (https://portfolio-sklejny.vercel.app), currently behind Vercel Authentication. Site, case studies, About content and the automation playground are in place.

## Stack

Next.js 16 (App Router, static export) · React 19 · TypeScript · Tailwind CSS v4

## Setup

Requires Node.js 20.9+.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server (`predev` copies PDF.js / Tesseract.js assets into `public/vendor/`) |
| `npm run build` | Static export to `out/` (`prebuild` copies vendor assets, `postbuild` fixes Windows segment files) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run test` | Vitest unit tests (engine, workflows, UI logic) |
| `npm run check` | Lint + typecheck + tests + build (run before committing) |
| `npm run e2e` | Playwright journeys + axe accessibility checks against `out/` (build first; uses installed Edge locally) |
| `npm run check:all` | `check` + `e2e` |

## Structure

```text
src/
  app/          routes: /, /projects, /projects/[slug], /playground, /about, /contact
  components/   shared UI (ui.tsx), header/footer/tab bar, contact button, project index
  content/      site.ts (identity, contact), projects.ts (case studies), skills.ts, experience.ts
  features/playground/
    engine/     workflow schema, graph validation, executor (pure TS, tested)
    adapters/   integrations: simulated (finance, helpdesk) or on-device (document reading, field rules)
    intake/     file checks, PDF/OCR reading, .eml parsing, CSV export (runs in the browser)
    workflows/  workflow definitions + sample inputs (expected outcomes tested)
    ui/         React Flow graph, replay, inspector
e2e/            Playwright specs (pages, navigation, motion switch, playground, file intake, axe); fixtures/ builds synthetic test files
scripts/        serve-out.mjs (static server for e2e), copy-vendor.mjs (pre-dev/build), fix-segment-files.mjs (postbuild, see below)
```

## Content

Edit `src/content/`. Fields left `null` render as visible placeholders. Never fill them with invented details.

## Environment variables

None yet. A `.env.example` will be added with the first one.

## Deployment

Hosted on Vercel, deployed from `main`. `npm run build` produces a static site in `out/` that any static host can serve. `vercel.json` sets the security headers (CSP, `frame-ancestors`, `nosniff`, referrer and permissions policies); `scripts/serve-out.mjs` applies the same headers in e2e tests.

Host requirements for the playground's file intake:

- Serve `.mjs` as `text/javascript` and `.wasm` as `application/wasm`, or the PDF reader won't load.
- `out/vendor/` holds about 19 MB of PDF.js / Tesseract.js assets (fetched only when a visitor reads a file). They are copied from `node_modules` at build time and not committed.
- Production pages carry a Content-Security-Policy `<meta>` tag (`connect-src 'self'`), and `vercel.json` sends the same policy as a header. Keep the two in step. The header also applies to the PDF.js and Tesseract workers, so it needs `'wasm-unsafe-eval'`. On another host, copy these headers.

## Known limitations

- Professional case studies are anonymised: no screenshots or code.
- Playground file intake: up to 10 MB, the first 5 PDF pages (3 for OCR), English OCR only. Field extraction is rule-based, not AI.
- After changing `generateStaticParams`, restart `npm run dev`, or new slugs 404 in dev.
- No contact form yet (a static export has no server; this needs a small serverless endpoint later).

## Known issue: Windows builds

Next.js 16.4 writes prefetch payloads with backslash paths on Windows (`about/__next.about/__PAGE__.txt` instead of `about/__next.about.__PAGE__.txt`), so client prefetches 404. `postbuild` runs `scripts/fix-segment-files.mjs` to flatten them; it does nothing on Linux/macOS builds. Remove it once Next fixes the export.

## Before launch

Set `site.url` in `src/content/site.ts` to the production origin. Until then the sitemap is empty and share-image URLs fall back to localhost.
