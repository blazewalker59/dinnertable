import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

// vi.mock rather than MSW: searchRecipes is a TanStack Start server function
// (needs the Start runtime to import); navigate needs a mounted router.
const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
const searchRecipes = vi.fn()
vi.mock('@/server/recipes', () => ({
  searchRecipes: (...a: Array<unknown>) => searchRecipes(...a),
}))

import { SearchBox } from '@/components/SearchBox'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  navigate.mockClear()
  searchRecipes.mockReset()
})

describe('SearchBox', () => {
  it('on phones, expands from an icon into a field and collapses on Cancel', () => {
    render(<SearchBox />)
    fireEvent.click(screen.getByRole('button', { name: 'Search recipes' }))
    // Focused in the tap itself, so iOS raises the keyboard.
    expect(document.activeElement).toBe(screen.getByRole('combobox'))
    expect(screen.queryByRole('button', { name: 'Search recipes' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Search recipes' })).toBeTruthy()
  })

  it('links options to the combobox and opens the highlighted one on Enter', async () => {
    vi.useFakeTimers()
    searchRecipes.mockResolvedValue({
      results: [
        { id: 7, title: 'Pot roast', attribution: null, sectionName: 'Mains' },
        { id: 9, title: 'Pie', attribution: 'Mama', sectionName: 'Desserts' },
      ],
    })
    render(<SearchBox />)
    const box = screen.getByRole('combobox')
    fireEvent.change(box, { target: { value: 'p' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })

    const list = screen.getByRole('listbox')
    expect(box.getAttribute('aria-controls')).toBe(list.id)
    const options = screen.getAllByRole('option')
    expect(options.every((o) => o.querySelector('button') === null)).toBe(true)

    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1].id)
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(navigate).toHaveBeenCalledWith({
      to: '/recipes/$recipeId',
      params: { recipeId: '9' },
    })
  })
})
