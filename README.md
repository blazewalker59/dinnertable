# dinnertable

A single-household family recipe shelf — surface, create, and share family
recipes, including photographed handwritten recipe cards.

Live at [dinnertable.cc](https://dinnertable.cc) (family members only, via
Cloudflare Access).

## Stack

- **TanStack Start** on **Cloudflare Workers** (`@cloudflare/vite-plugin`)
- **D1** (Drizzle ORM; FTS5 for search) + **R2** (image originals) +
  **Cloudflare Image Transformations** (thumbnails)
- **Cloudflare Access** for auth (email allowlist, no in-app auth code)

## Design docs

- [docs/DOMAIN.md](docs/DOMAIN.md) — entities, relationships, invariants
- [docs/GLOSSARY.md](docs/GLOSSARY.md) — the project's ubiquitous language
- [docs/adr/](docs/adr/) — one ADR per design decision

## Development

```sh
npm install
npm run dev        # wrangler local D1/R2 emulation
npm run deploy     # wrangler deploy
```

Family recipe content (the source PDF and extracted seed data) is deliberately
not committed; seeding runs locally against remote D1.
