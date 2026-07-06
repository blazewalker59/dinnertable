import { env } from 'cloudflare:workers'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { members } from '../db/schema'
import { createAuth } from '../lib/auth'
import { normalizeHeaders } from '../lib/headers'

export type Member = typeof members.$inferSelect

// Resolves the signed-in identity from the Better Auth session (ADR-0014).
// Returns null when signed out.
async function sessionIdentity(): Promise<{
  email: string
  name: string
} | null> {
  // Local dev/e2e can bypass Google with a fake identity from .dev.vars.
  // Never set DEV_USER_EMAIL in production vars.
  if (env.DEV_USER_EMAIL)
    return { email: env.DEV_USER_EMAIL, name: env.DEV_USER_EMAIL.split('@')[0] }

  const auth = createAuth()
  const session = await auth.api.getSession({
    headers: normalizeHeaders(getRequestHeaders()),
  })
  if (!session) return null
  return { email: session.user.email, name: session.user.name }
}

// The app's own member concept: recipes/favorites reference members, not the
// auth user table. Auto-provisioned on first sign-in; email is the join key,
// so pre-seeded members (e.g. the book importer) are reused.
async function memberFor(identity: { email: string; name: string }) {
  const d = db()
  const [created] = await d
    .insert(members)
    .values({
      email: identity.email,
      displayName: identity.name || identity.email.split('@')[0],
    })
    .onConflictDoNothing()
    .returning()
  if (created) return created
  const [existing] = await d
    .select()
    .from(members)
    .where(eq(members.email, identity.email))
  return existing
}

export async function maybeMember(): Promise<Member | null> {
  const identity = await sessionIdentity()
  return identity ? memberFor(identity) : null
}

export async function currentMember(): Promise<Member> {
  const member = await maybeMember()
  if (!member) throw new Response('Unauthorized', { status: 401 })
  return member
}
