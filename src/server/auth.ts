import { env } from 'cloudflare:workers'
import { getRequestHeader } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { db } from '../db'
import { members } from '../db/schema'

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

// Cloudflare Access blocks strangers at the edge (ADR-0002); this verifies
// its JWT server-side so the app never trusts a bare header.
async function verifiedEmail(): Promise<string | null> {
  // Local dev runs without Access in the loop; .dev.vars supplies a fake
  // identity. Never set DEV_USER_EMAIL in production vars.
  if (env.DEV_USER_EMAIL) return env.DEV_USER_EMAIL

  const jwt = getRequestHeader('cf-access-jwt-assertion')
  if (!jwt) return null
  jwks ??= createRemoteJWKSet(
    new URL(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`),
  )
  try {
    const { payload } = await jwtVerify(jwt, jwks, {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
      audience: env.ACCESS_AUD,
    })
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

export type Member = typeof members.$inferSelect

export async function currentMember(): Promise<Member> {
  const email = await verifiedEmail()
  if (!email) throw new Response('Unauthorized', { status: 401 })

  const d = db()
  const [created] = await d
    .insert(members)
    .values({ email, displayName: email.split('@')[0] })
    .onConflictDoNothing()
    .returning()
  if (created) return created
  const [existing] = await d
    .select()
    .from(members)
    .where(eq(members.email, email))
  return existing
}
