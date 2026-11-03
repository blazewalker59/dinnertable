import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'

// vi.mock rather than MSW: deleteImage/uploadImage are TanStack Start server
// functions (need the Start runtime to import); the router needs mounting.
const invalidate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate }),
}))
const deleteImage = vi.fn()
vi.mock('@/server/images', () => ({
  deleteImage: (...a: Array<unknown>) => deleteImage(...a),
  uploadImage: vi.fn(),
}))
vi.mock('@/lib/image-client', () => ({ rendition: vi.fn() }))

import { RecipeImages } from '@/components/RecipeImages'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  deleteImage.mockReset()
})

const images = [
  { id: 'a', width: 100, height: 100 },
  { id: 'b', width: 100, height: 100 },
]

function openViewer() {
  render(<RecipeImages recipeId={1} title="Pot roast" images={images} />)
  fireEvent.click(screen.getAllByRole('button', { name: 'View photo' })[0])
  return screen.getByRole('dialog')
}

describe('RecipeImages', () => {
  it('describes photos with the recipe title', () => {
    render(<RecipeImages recipeId={1} title="Pot roast" images={images} />)
    expect(screen.getByAltText('Photo of Pot roast')).toBeTruthy()
    expect(screen.getByAltText('Photo 2 of Pot roast')).toBeTruthy()
  })

  it('can remove a photo from the viewer (reachable on touch)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteImage.mockResolvedValue(undefined)
    const dialog = openViewer()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }))
    })
    expect(deleteImage).toHaveBeenCalledWith({ data: 'a' })
  })

  it('swipes to the next photo without closing the viewer', () => {
    const dialog = openViewer()
    fireEvent.pointerDown(dialog, { clientX: 300, clientY: 200 })
    fireEvent.pointerUp(dialog, { clientX: 100, clientY: 210 })
    fireEvent.click(dialog)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('2 / 2')).toBeTruthy()
  })

  it('still closes on a plain tap of the backdrop', () => {
    const dialog = openViewer()
    fireEvent.pointerDown(dialog, { clientX: 100, clientY: 100 })
    fireEvent.pointerUp(dialog, { clientX: 102, clientY: 101 })
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
