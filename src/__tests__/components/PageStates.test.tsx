import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

// vi.mock rather than MSW: there's no HTTP here, only router hooks, which
// need a mounted router. Link renders as a plain anchor.
const invalidate = vi.fn()
let isLoading = false
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: Record<string, never>) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ invalidate }),
  useRouterState: ({
    select,
  }: {
    select: (s: { isLoading: boolean }) => unknown
  }) => select({ isLoading }),
}))

import { ErrorPage, NotFoundPage, RouteProgress } from '@/components/PageStates'

afterEach(() => {
  cleanup()
  invalidate.mockClear()
  isLoading = false
  vi.useRealTimers()
})

describe('NotFoundPage', () => {
  it('offers a way back home', () => {
    render(<NotFoundPage />)
    expect(
      screen.getByRole('link', { name: 'Back to recipes' }).getAttribute('href'),
    ).toBe('/')
  })
})

describe('ErrorPage', () => {
  it('shows the error and retries by resetting and reloading data', () => {
    const reset = vi.fn()
    render(<ErrorPage error={new Error('D1 is down')} reset={reset} info={undefined} />)
    expect(screen.getByText('D1 is down')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalled()
    expect(invalidate).toHaveBeenCalled()
  })

  it('falls back to a generic message', () => {
    render(<ErrorPage error={new Error('')} reset={vi.fn()} info={undefined} />)
    expect(screen.getByText(/Check your connection/)).toBeTruthy()
  })
})

describe('RouteProgress', () => {
  it('shows only for loads longer than 150ms', () => {
    vi.useFakeTimers()
    const { rerender } = render(<RouteProgress />)
    expect(screen.queryByRole('progressbar')).toBeNull()

    isLoading = true
    rerender(<RouteProgress />)
    act(() => vi.advanceTimersByTime(100))
    expect(screen.queryByRole('progressbar')).toBeNull()
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getByRole('progressbar')).toBeTruthy()

    isLoading = false
    rerender(<RouteProgress />)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
