import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Keeps the screen awake while `on`. The OS drops the lock whenever the page
 * is hidden, so it's re-requested when the page becomes visible again.
 * `supported` is false where the API is missing (e.g. installed iOS apps
 * before 18.4); hide the control there.
 */
export function useWakeLock() {
  const [supported, setSupported] = useState(false)
  const [on, setOn] = useState(false)
  const sentinel = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    setSupported('wakeLock' in navigator)
  }, [])

  const acquire = useCallback(async () => {
    try {
      sentinel.current = await navigator.wakeLock.request('screen')
    } catch {
      // Denied (low battery, not visible). Turn the toggle back off.
      setOn(false)
    }
  }, [])

  useEffect(() => {
    if (!on) return
    void acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel.current?.release().catch(() => {})
      sentinel.current = null
    }
  }, [on, acquire])

  return { supported, on, setOn }
}
