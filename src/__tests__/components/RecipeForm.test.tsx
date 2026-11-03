import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// vi.mock rather than MSW: createSection is a TanStack Start server function
// that needs the Start runtime to import.
vi.mock('@/server/sections', () => ({ createSection: vi.fn() }))

import { RecipeForm } from '@/components/RecipeForm'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const sections = [{ id: 1, name: 'Desserts' }]

function setup(props: Partial<Parameters<typeof RecipeForm>[0]> = {}) {
  const onCancel = vi.fn()
  const onEdit = vi.fn()
  render(
    <RecipeForm
      sections={sections}
      submitLabel="Save"
      onSubmit={vi.fn()}
      onCancel={onCancel}
      onEdit={onEdit}
      {...props}
    />,
  )
  return { onCancel, onEdit }
}

describe('RecipeForm', () => {
  it('cancels straight away when nothing was typed', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { onCancel } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it('asks before discarding typed changes', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { onCancel, onEdit } = setup()
    fireEvent.input(screen.getByRole('textbox', { name: /Title/ }), {
      target: { value: 'Pie' },
    })
    expect(onEdit).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('locks the fields and Save while something else fills the form', () => {
    setup({ locked: true })
    // Disabled through the surrounding <fieldset>, so check :disabled
    // rather than the element's own property.
    expect(
      screen.getByRole('textbox', { name: /Title/ }).matches(':disabled'),
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})
