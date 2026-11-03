import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db'
import { apiTokens } from '../db/schema'
import { currentMember } from './auth'
import { createToken } from './mcp/tokens'

// A member's API tokens for their AI agent (ADR-0015): list, create (shown
// once) and revoke.

/** Enough for a few agents; more is likely tokens nobody revoked. */
const MAX_ACTIVE_TOKENS = 10

export const listApiTokens = createServerFn().handler(async () => {
  const me = await currentMember()
  return db()
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.prefix,
      scopes: apiTokens.scopes,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .where(and(eq(apiTokens.memberId, me.id), isNull(apiTokens.revokedAt)))
    .orderBy(desc(apiTokens.createdAt))
})

export const createApiToken = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; canAdd: boolean }) => {
    const name = String(data.name ?? '').trim().slice(0, 60)
    if (!name) throw new Error('Give the token a name')
    return { name, canAdd: Boolean(data.canAdd) }
  })
  .handler(async ({ data }) => {
    const me = await currentMember()
    const active = await db()
      .select({ id: apiTokens.id })
      .from(apiTokens)
      .where(and(eq(apiTokens.memberId, me.id), isNull(apiTokens.revokedAt)))
    if (active.length >= MAX_ACTIVE_TOKENS)
      throw new Error(
        `You have ${MAX_ACTIVE_TOKENS} tokens: revoke one to make another`,
      )
    return createToken(
      me.id,
      data.name,
      data.canAdd ? ['read', 'add'] : ['read'],
    )
  })

/** Stops a token working, at once. */
export const revokeApiToken = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => String(id).slice(0, 64))
  .handler(async ({ data: id }) => {
    const me = await currentMember()
    await db()
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(apiTokens.id, id), eq(apiTokens.memberId, me.id)))
    return { ok: true }
  })
