import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sqliteDb } from '@test/sqlite-db'

// vi.mock rather than MSW: this is D1 through Drizzle, not HTTP. The app's
// db() is pointed at a real in-memory SQLite with every migration applied.
const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/db', () => ({ db: () => state.db }))

import {
  REQUESTS_PER_MINUTE,
  bearerToken,
  createToken,
  hashToken,
  newToken,
  verifyToken,
} from '@/server/mcp/tokens'

describe('API tokens', () => {
  it('are long, random and URL-safe', () => {
    const a = newToken()
    expect(a).toMatch(/^dt_[A-Za-z0-9_-]{43}$/)
    expect(newToken()).not.toBe(a)
  })

  it('are stored as their SHA-256', async () => {
    expect(await hashToken('dt_abc')).toBe(await hashToken('dt_abc'))
    expect(await hashToken('dt_abc')).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashToken('dt_abc')).not.toBe(await hashToken('dt_abd'))
  })

  it('come only from a Bearer header with our prefix', () => {
    expect(bearerToken('Bearer dt_abc')).toBe('dt_abc')
    expect(bearerToken('bearer   dt_abc')).toBe('dt_abc')
    expect(bearerToken('Bearer sl_abc')).toBeNull()
    expect(bearerToken('Basic dt_abc')).toBeNull()
    expect(bearerToken(null)).toBeNull()
  })
})

describe('verifyToken', () => {
  let sqlite: ReturnType<typeof sqliteDb>['sqlite']

  beforeEach(() => {
    const made = sqliteDb()
    sqlite = made.sqlite
    state.db = made.db
    sqlite.exec(
      "INSERT INTO members (id, email, display_name) VALUES (1, 'blaze@example.com', 'Blaze')",
    )
  })

  it('identifies the member and scopes, and never stores the token itself', async () => {
    const { id, token } = await createToken(1, 'Claude', ['read', 'add'])
    const caller = await verifyToken(token)
    expect(caller).toMatchObject({
      tokenId: id,
      agentName: 'Claude',
      memberId: 1,
      memberName: 'Blaze',
      scopes: ['read', 'add'],
      retryAfter: 0,
    })
    const stored = sqlite.prepare('SELECT * FROM api_tokens').all()
    expect(JSON.stringify(stored)).not.toContain(token)
    expect(stored[0]).toMatchObject({ prefix: token.slice(0, 10) })
  })

  it('refuses unknown and revoked tokens', async () => {
    expect(await verifyToken(newToken())).toBeNull()
    const { token } = await createToken(1, 'Old')
    sqlite.exec('UPDATE api_tokens SET revoked_at = unixepoch()')
    expect(await verifyToken(token)).toBeNull()
  })

  it(`allows ${REQUESTS_PER_MINUTE} requests a minute, then says how long to wait`, async () => {
    const { token } = await createToken(1, 'Busy')
    const start = new Date('2026-11-02T12:00:00Z')
    for (let i = 0; i < REQUESTS_PER_MINUTE; i++) {
      expect((await verifyToken(token, start))!.retryAfter).toBe(0)
    }
    const later = new Date(start.getTime() + 20_000)
    expect((await verifyToken(token, later))!.retryAfter).toBe(40)
    // A new window opens a minute after the first request.
    const next = new Date(start.getTime() + 61_000)
    expect((await verifyToken(token, next))!.retryAfter).toBe(0)
  })
})
