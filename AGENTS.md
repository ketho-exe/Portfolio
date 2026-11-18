<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide

Personal portfolio and digital studio. Full brief: `vault/01 Strategy/Project Brief.md`.

## Session routine

1. Read this file and `README.md`.
2. Read `vault/00 Dashboard/Home.md` (current phase, priorities, next tasks).
3. `git status` and `git log --oneline -10`.
4. Continue the next incomplete task. Don't restart planning.
5. At the end: update the dashboard, `vault/05 Development/Changelog.md` and, for real decisions, `vault/05 Development/Decisions.md`. Keep it short.

`vault/` is the Obsidian vault. It is git-ignored on purpose (personal career notes). Never commit it.

## Hard rules

- **No invented facts.** No made-up name, bio, employers, contact details, metrics, testimonials or outcomes. Unknowns stay `null` in `src/content/*.ts` and render as `<Placeholder>`.
- Label every project honestly (`kind`, `status`). Simulations must say they are simulations.
- No confidential employer data, code or screenshots. Synthetic data only.
- No secrets in the repo or client bundle. Add `.env.example` (names only) when the first env var appears.
- Don't deploy, push, buy, subscribe or publish without the owner's explicit OK.
- Be concise in code comments, docs and reports.

## Architecture (short)

- Next.js 16 App Router, TypeScript, Tailwind CSS v4. **Static export** (`output: "export"`), so: no server actions, no request-time route handlers, no middleware/proxy, no ISR. Cache Components is off because it is incompatible with export.
- Dynamic routes need `generateStaticParams` and `dynamicParams = false`.
- Content lives in `src/content/` as typed data. Pages in `src/app/`. Shared UI in `src/components/ui.tsx`.
- Theme: tokens in `src/app/globals.css` (`:root` = light, `[data-theme="dark"]` = dark). Dark is the default; an inline script in `layout.tsx` applies the saved or system theme before paint. Use token classes (`bg-bg`, `text-muted`, `border-border`, `text-accent`...), not raw colours.
- Planned: `src/features/playground/` with a pure TypeScript workflow engine (unit-tested with Vitest) and React Flow UI.

## Checks

`npm run check` = lint + typecheck + production build. Run it before every commit. Review mobile (375px) and desktop in both themes before calling UI work done.
