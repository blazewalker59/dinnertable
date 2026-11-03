import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useWakeLock } from '@/lib/useWakeLock'

const nav = navigator as unknown as { wakeLock?: unknown }

afterEach(() => {
  delete nav.wakeLock
})

function installWakeLock(request = vi.fn()) {
  const release = vi.fn().mockResolvedValue(undefined)
  request.mockResolvedValue({ release })
  Object.defineProperty(navigator, 'wakeLock', {
    value: { request },
    configurable: true,
  })
  return { request, release }
}

describe('useWakeLock', () => {
  it('reports unsupported when the API is missing', () => {
    const { result } = renderHook(() => useWakeLock())
    expect(result.current.supported).toBe(false)
  })

  it('requests a screen lock when turned on and releases it when off', async () => {
    const { request, release } = installWakeLock()
    const { result } = renderHook(() => useWakeLock())
    expect(result.current.supported).toBe(true)

    await act(async () => result.current.setOn(true))
    expect(request).toHaveBeenCalledWith('screen')

    await act(async () => result.current.setOn(false))
    expect(release).toHaveBeenCalled()
  })

  it('re-requests the lock when the page becomes visible again', async () => {
    const { request } = installWakeLock()
    const { result } = renderHook(() => useWakeLock())
    await act(async () => result.current.setOn(true))
    expect(request).toHaveBeenCalledTimes(1)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('turns itself back off when the request is denied', async () => {
    const request = vi.fn()
    installWakeLock(request)
    request.mockRejectedValue(new Error('NotAllowedError'))
    const { result } = renderHook(() => useWakeLock())
    await act(async () => result.current.setOn(true))
    expect(result.current.on).toBe(false)
  })
})
