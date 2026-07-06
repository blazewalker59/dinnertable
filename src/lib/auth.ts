import { env } from 'cloudflare:workers'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db'

function allowlist(): Set<string> {
  return new Set(
    (env.ALLOWLIST_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

// Built per request: the D1 client (an I/O binding) must be created inside a
// request context. See ADR-0014.
export function createAuth() {
  return betterAuth({
    database: drizzleAdapter(db(), { provider: 'sqlite' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    databaseHooks: {
      user: {
        create: {
          // For OAuth the email isn't in the request body, so the family
          // allowlist is enforced here — after Google resolves the email,
          // before the user row is created. A disallowed email never gets a
          // row (ADR-0014).
          before: async (newUser) => {
            const allowed = allowlist()
            if (allowed.size > 0 && !allowed.has(newUser.email.toLowerCase())) {
              throw new APIError('FORBIDDEN', {
                message: 'This email is not part of the family allowlist.',
              })
            }
            return { data: newUser }
          },
        },
      },
    },
    // Must be last.
    plugins: [tanstackStartCookies()],
  })
}

export type Auth = ReturnType<typeof createAuth>
