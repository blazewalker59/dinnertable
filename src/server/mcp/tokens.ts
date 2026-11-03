/**
 * API tokens for agents (ADR-0015): a member creates one, sees it once, and
 * gives it to their agent; only its SHA-256 is stored. Server-only.
 */

import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../../db'
import { apiTokens, members } from '../../db/schema'
import type { TokenScope } from '../../db/schema'

/** Marks a dinnertable token, so a leaked one is easy to spot and scan for. */
const TOKEN_PREFIX = 'dt_'
/** How much of a token is shown on screen to tell tokens apart. */
const SHOWN_CHARS = 10
/** Requests a token may make per minute. */
export const REQUESTS_PER_MINUTE = 60

/** A new random token: "dt_" and 32 random bytes, base64url. */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const base64 = btoa(String.fromCharCode(...bytes))
  return (
    TOKEN_PREFIX +
    base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  )
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** The token from an `Authorization: Bearer …` header, if it's one of ours. */
export function bearerToken(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '')
  const token = match?.[1] ?? null
  return token?.startsWith(TOKEN_PREFIX) ? token : null
}

/** Store a new token for a member; returns it, the only time it's seen. */
export async function createToken(
  memberId: number,
  name: string,
  scopes: Array<TokenScope> = ['read'],
): Promise<{ id: string; token: string }> {
  const token = newToken()
  const id = crypto.randomUUID()
  await db()
    .insert(apiTokens)
    .values({
      id,
      memberId,
      name,
      tokenHash: await hashToken(token),
      prefix: token.slice(0, SHOWN_CHARS),
      scopes,
    })
  return { id, token }
}

export interface Caller {
  tokenId: string
  /** What the member called the token. */
  agentName: string
  memberId: number
  memberName: string
  scopes: Array<TokenScope>
  /** Seconds to wait before another request, when over the rate limit. */
  retryAfter: number
}

/**
 * Whose token this is and what it may do, or null if unknown or revoked.
 * Each call counts toward the token's per-minute limit (a fixed window,
 * kept on the token's row in one atomic update).
 */
export async function verifyToken(
  token: string,
  now = new Date(),
): Promise<Caller | null> {
  const seconds = Math.floor(now.getTime() / 1000)
  const windowOpen = sql`${apiTokens.windowStart} > ${seconds - 60}`
  const [row] = await db()
    .update(apiTokens)
    .set({
      lastUsedAt: now,
      windowStart: sql`CASE WHEN ${windowOpen} THEN ${apiTokens.windowStart} ELSE ${seconds} END`,
      windowCount: sql`CASE WHEN ${windowOpen} THEN ${apiTokens.windowCount} + 1 ELSE 1 END`,
    })
    .where(
      and(
        eq(apiTokens.tokenHash, await hashToken(token)),
        isNull(apiTokens.revokedAt),
      ),
    )
    .returning()
  if (!row) return null
  const [member] = await db()
    .select({ displayName: members.displayName })
    .from(members)
    .where(eq(members.id, row.memberId))
  return {
    tokenId: row.id,
    agentName: row.name,
    memberId: row.memberId,
    memberName: member?.displayName ?? 'a family member',
    scopes: row.scopes,
    retryAfter:
      row.windowCount > REQUESTS_PER_MINUTE
        ? Math.max(1, row.windowStart + 60 - seconds)
        : 0,
  }
}
