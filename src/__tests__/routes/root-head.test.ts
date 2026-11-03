import { describe, it, expect, vi } from 'vitest'

// vi.mock rather than MSW: getMe is a TanStack Start server function that
// needs the Start runtime to import. Only the static head() is under test.
vi.mock('@/server/members', () => ({ getMe: vi.fn() }))
vi.mock('@/server/recipes', () => ({ searchRecipes: vi.fn() }))

import { Route } from '@/routes/__root'

function meta(name: string) {
  const head = Route.options.head?.({} as never) as {
    meta: Array<{ name?: string; content?: string }>
  }
  return head.meta.find((m) => m.name === name)?.content
}

describe('root head (installed iOS app)', () => {
  it('does not use a translucent status bar, which iOS blurs content under', () => {
    expect(meta('apple-mobile-web-app-status-bar-style')).toBe('default')
  })

  it('exposes safe-area insets so the header can pad below the status bar', () => {
    expect(meta('viewport')).toContain('viewport-fit=cover')
  })

  it('colors the status bar to match the solid white header', () => {
    expect(meta('theme-color')).toBe('#ffffff')
  })
})
