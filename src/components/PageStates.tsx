import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Sprig } from './Sprig'

/**
 * Thin bar under the status bar while a route's data loads. Client-only and
 * delayed 150ms, so fast navigations don't flash it and the server render
 * never ships one.
 */
export function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.isLoading })
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!loading) {
      setShow(false)
      return
    }
    const t = setTimeout(() => setShow(true), 150)
    return () => clearTimeout(t)
  }, [loading])
  if (!show) return null
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-50 h-0.5 overflow-hidden bg-leaf/30"
    >
      <div className="route-progress h-full w-1/3 bg-leaf-deep" />
    </div>
  )
}

function Shell({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <main className="page flex max-w-md flex-col items-center text-center">
      <Sprig className="mt-8 h-8 w-16" />
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="mt-2 text-ink-soft">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>
    </main>
  )
}

export function NotFoundPage() {
  return (
    <Shell
      title="That recipe isn't on the shelf"
      body="It may have been deleted, or the link is out of date."
    >
      <Link to="/" className="btn-primary">
        Back to recipes
      </Link>
    </Shell>
  )
}

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <Shell
      title="Something went wrong"
      body={
        error instanceof Error && error.message
          ? error.message
          : 'Check your connection and try again.'
      }
    >
      <button
        className="btn-secondary"
        onClick={() => {
          reset()
          void router.invalidate()
        }}
      >
        Try again
      </button>
      <Link to="/" className="btn-primary">
        Back to recipes
      </Link>
    </Shell>
  )
}
