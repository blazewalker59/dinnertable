# ADR-0012: TanStack Start on Cloudflare Workers, Drizzle on D1

**Status:** Accepted (2026-07-05)

## Context
Owner mandate: fully Cloudflare, TanStack Start frontend. Data layer options
were Drizzle, raw D1 SQL, Prisma/kysely.

## Decision
- **TanStack Start** deployed to **Cloudflare Workers** via the official
  `@cloudflare/vite-plugin`; loaders and server functions run in the Worker
  with bindings to D1 and R2.
- **Drizzle ORM** for D1: TypeScript schema, `drizzle-kit` migrations applied
  through wrangler, typed queries end-to-end.
- Exception: the FTS5 virtual table + triggers are a hand-written migration
  and raw SQL queries (ADR-0006).
- Deploys via wrangler (Workers Builds from the repo once it's on GitHub).

## Consequences
- ~6 tables: members, sections, recipes, recipe_images, favorites, recipes_fts.
- Local dev uses wrangler's local D1/R2 emulation.
