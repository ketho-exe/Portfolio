# Portfolio

Personal portfolio and digital studio: web development, software solutions, business automation and integrations.

**Status:** early development. The site shell and page templates are built; owner content and the automation playground are not yet in place.

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
| `npm run check` | Lint + typecheck + build (run before committing) |

## Structure

```text
src/
  app/          routes: /, /projects, /projects/[slug], /about, /contact
  components/   shared UI (ui.tsx), header/footer, project card
  content/      site.ts (identity, contact), projects.ts (case studies), skills.ts
```

## Content

Edit `src/content/`. Fields left `null` render as visible placeholders. Never fill them with invented details.

## Environment variables

None yet. A `.env.example` will be added with the first one.

## Deployment

Not deployed yet. `npm run build` produces a static site in `out/` that can be served by any static host. Hosting choice: see the project vault (`Hosting and Costs`).

## Known limitations

- Owner name, bio, experience, contact links and CV are placeholders.
- All listed projects are planned. Case studies describe intent only.
- No contact form yet (a static export has no server; this needs a small serverless endpoint later).
