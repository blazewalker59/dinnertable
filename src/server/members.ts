import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { members } from '../db/schema'
import { currentMember, maybeMember } from './auth'

export const getMe = createServerFn().handler(async () => maybeMember())

export const updateDisplayName = createServerFn({ method: 'POST' })
  .inputValidator((name: string) => {
    const trimmed = name.trim()
    if (!trimmed || trimmed.length > 60) throw new Error('Name must be 1-60 characters')
    return trimmed
  })
  .handler(async ({ data }) => {
    const me = await currentMember()
    const [updated] = await db()
      .update(members)
      .set({ displayName: data })
      .where(eq(members.id, me.id))
      .returning()
    return updated
  })
