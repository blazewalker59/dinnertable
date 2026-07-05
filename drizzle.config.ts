import { defineConfig } from 'drizzle-kit'

// Migrations are generated here by drizzle-kit and applied by
// `wrangler d1 migrations apply` (see package.json scripts).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
})
