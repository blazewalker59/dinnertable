import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Sprig } from '../components/Sprig'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.me) throw redirect({ to: '/' })
  },
  component: Login,
})

function Login() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn() {
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    })
    if (err) {
      setError(err.message ?? 'Sign-in failed')
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Sprig className="mb-4 h-10 w-20" />
      <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        dinnertable
      </h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        The family recipe shelf — recipes worth keeping, from our kitchen to
        yours.
      </p>
      <button
        onClick={signIn}
        disabled={busy}
        className="mt-8 flex items-center gap-3 rounded-full border border-line bg-card px-6 py-3 font-semibold shadow-sm transition hover:border-leaf-deep hover:shadow disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
        {busy ? 'Opening Google…' : 'Continue with Google'}
      </button>
      {error && <p className="mt-4 text-sm text-petal-deep">{error}</p>}
      <p className="mt-8 max-w-xs text-xs text-ink-soft">
        Family members only — ask Blaze to add your email if you can't get in.
      </p>
    </main>
  )
}
