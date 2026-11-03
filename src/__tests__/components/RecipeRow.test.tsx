import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

// vi.mock rather than MSW: no HTTP involved; Link needs a mounted router.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: Record<string, never>) => (
    <a className={className}>{children}</a>
  ),
}))

import { RecipeList, RecipeRow } from '@/components/RecipeRow'

afterEach(cleanup)

function renderRow(props: Partial<Parameters<typeof RecipeRow>[0]> = {}) {
  return render(
    <RecipeList>
      <RecipeRow id={1} title="Pot roast" imageId={null} {...props} />
    </RecipeList>,
  )
}

describe('RecipeRow', () => {
  it('shows the thumbnail when the recipe has a photo', () => {
    const { container } = renderRow({ imageId: 'abc' })
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/img/abc/thumb',
    )
  })

  it('shows a sprig placeholder without a photo', () => {
    const { container } = renderRow()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('shows the detail line, tag and favorite mark', () => {
    renderRow({ detail: 'From Mama', tag: 'Mains', isFavorite: true })
    expect(screen.getByText('From Mama')).toBeTruthy()
    expect(screen.getByText('Mains')).toBeTruthy()
    expect(screen.getByLabelText('Favorited')).toBeTruthy()
  })
})
