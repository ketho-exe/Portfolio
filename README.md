# Portfolio

Personal portfolio and digital studio: web development, software solutions, business automation and integrations.

**Status:** in development, not yet deployed. Site, case studies and About content are in place; the automation playground is next.

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
| `npm run dev` | Development server |
| `npm run build` | Static export to `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run test` | Vitest unit tests (engine, workflows, UI logic) |
| `npm run check` | Lint + typecheck + tests + build (run before committing) |

## Structure

```text
src/
  app/          routes: /, /projects, /projects/[slug], /playground, /about, /contact
  components/   shared UI (ui.tsx), header/footer, project card
  content/      site.ts (identity, contact), projects.ts (case studies), skills.ts, experience.ts
  features/playground/
    engine/     workflow schema, graph validation, executor (pure TS, tested)
    adapters/   simulated integrations (finance, helpdesk, documents)
    workflows/  workflow definitions + sample inputs (expected outcomes tested)
    ui/         React Flow graph, replay, inspector
```

## Content

Edit `src/content/`. Fields left `null` render as visible placeholders. Never fill them with invented details.

## Environment variables

None yet. A `.env.example` will be added with the first one.

## Deployment

Not deployed yet. `npm run build` produces a static site in `out/` that can be served by any static host. Hosting choice: see the project vault (`Hosting and Costs`).

## Known limitations

- Professional case studies are anonymised: no screenshots or code.
- Personal projects (playground, dashboard, document processor) are planned. Their pages describe intent only.
- After changing `generateStaticParams`, restart `npm run dev`, or new slugs 404 in dev.
- No contact form yet (a static export has no server; this needs a small serverless endpoint later).
