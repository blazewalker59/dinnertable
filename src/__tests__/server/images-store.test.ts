import { describe, it, expect, vi } from 'vitest'

// vi.mock rather than MSW: this is a D1 query through Drizzle, not HTTP, and
// cloudflare:workers is aliased to a stub in vitest.config.ts.
const rows: Array<{ id: string; recipeId: number }> = []
const select = vi.fn(() => ({
  from: () => ({ where: () => ({ orderBy: async () => rows }) }),
}))
vi.mock('@/db', () => ({ db: () => ({ select }) }))

import { withFirstImage } from '@/server/images-store'

describe('withFirstImage', () => {
  it('adds the first photo of each recipe, or null when it has none', async () => {
    rows.splice(0, rows.length,
      { id: 'a1', recipeId: 1 },
      { id: 'a2', recipeId: 1 },
      { id: 'c1', recipeId: 3 },
    )
    const out = await withFirstImage([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(out).toEqual([
      { id: 1, imageId: 'a1' },
      { id: 2, imageId: null },
      { id: 3, imageId: 'c1' },
    ])
  })

  it('skips the query for an empty list', async () => {
    select.mockClear()
    expect(await withFirstImage([])).toEqual([])
    expect(select).not.toHaveBeenCalled()
  })
})
