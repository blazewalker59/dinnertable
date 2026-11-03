import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  IngredientChecklist,
  KeepScreenOn,
  Steps,
} from '@/components/RecipeReading'

afterEach(() => {
  cleanup()
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock
})

describe('IngredientChecklist', () => {
  it('gives each ingredient a checkbox, but not the sub-headings', () => {
    render(<IngredientChecklist text={'Frosting:\n1 cup butter\n2 cups sugar'} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(2)
    expect(screen.getByLabelText('1 cup butter')).toBe(boxes[0])
    expect(screen.queryByLabelText('Frosting')).toBeNull()
    expect(screen.getByText('Frosting')).toBeTruthy()
  })

  it('ticks an ingredient off when tapped', () => {
    render(<IngredientChecklist text="2 eggs" />)
    const box = screen.getByLabelText('2 eggs') as HTMLInputElement
    fireEvent.click(box)
    expect(box.checked).toBe(true)
  })
})

describe('Steps', () => {
  it('renders an ordered list with the step number for screen readers', () => {
    render(<Steps text={'1. Mix\n2. Bake'} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[1].textContent).toContain('Step 2: Bake')
  })
})

describe('KeepScreenOn', () => {
  it('is hidden where the wake lock API is unavailable', () => {
    const { container } = render(<KeepScreenOn />)
    expect(container.innerHTML).toBe('')
  })

  it('shows a switch where the API exists', () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: () => Promise.resolve({ release: async () => {} }) },
      configurable: true,
    })
    render(<KeepScreenOn />)
    expect(screen.getByRole('switch', { name: 'Keep screen on' })).toBeTruthy()
  })
})
