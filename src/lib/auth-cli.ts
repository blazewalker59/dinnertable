import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

// Config used ONLY by `better-auth generate` (npm run auth:generate) to emit
// the expected Drizzle schema for the installed Better Auth version. It must
// NOT import `cloudflare:workers` (the CLI runs under Node). The CLI inspects
// the option shape, not a live DB, so placeholders are fine. Diff its output
// against src/db/schema.ts to catch drift.
export const auth = betterAuth({
  database: drizzleAdapter({} as never, { provider: 'sqlite' }),
  socialProviders: {
    google: { clientId: 'placeholder', clientSecret: 'placeholder' },
  },
})
