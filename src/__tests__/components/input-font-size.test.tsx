import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import type { ReactElement } from 'react'

// vi.mock rather than MSW: these are TanStack Start server functions and
// router hooks, which need the Start runtime to even import. The components'
// markup is all that's under test here.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({ invalidate: vi.fn() }),
}))
vi.mock('@/server/recipes', () => ({ searchRecipes: vi.fn() }))
vi.mock('@/server/sections', () => ({
  createSection: vi.fn(),
  deleteSection: vi.fn(),
  renameSection: vi.fn(),
}))

import { SearchBox } from '@/components/SearchBox'
import { ManageSections } from '@/components/ManageSections'
import { RecipeForm } from '@/components/RecipeForm'

afterEach(cleanup)

// iOS Safari zooms the viewport when a focused field's font is under 16px.
// Small text is only allowed behind `pointer-fine:` (mouse/trackpad).
const SMALL_TEXT = /(?:^|\s)text-(?:xs|sm|\[\d+(?:\.\d+)?px\])(?:\s|$)/

function textFields(ui: ReactElement) {
  const { container } = render(ui)
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select',
    ),
  )
}

const sections = [{ id: 1, name: 'Desserts', recipeCount: 2 }]

describe.each([
  ['SearchBox', () => <SearchBox />],
  ['ManageSections', () => <ManageSections sections={sections} />],
  [
    'RecipeForm',
    () => (
      <RecipeForm sections={sections} submitLabel="Save" onSubmit={vi.fn()} />
    ),
  ],
])('%s text fields', (_name, ui) => {
  it('do not use sub-16px text on touch devices', () => {
    const fields = textFields(ui())
    expect(fields.length).toBeGreaterThan(0)
    for (const el of fields) {
      expect(el.className).not.toMatch(SMALL_TEXT)
    }
  })
})
