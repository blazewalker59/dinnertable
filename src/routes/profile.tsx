import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { updateDisplayName } from '../server/members'

export const Route = createFileRoute('/profile')({
  component: Profile,
})

function Profile() {
  const { me } = Route.useRouteContext()
  const router = useRouter()
  const navigate = useNavigate()
  const [name, setName] = useState(me?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!me) return null

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await navigate({ to: '/login' })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updateDisplayName({ data: name })
    await router.invalidate()
    setSaving(false)
    setSaved(true)
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight">
        Your profile
      </h1>
      <p className="mb-8 text-ink-soft">Signed in as {me.email}</p>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Display name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            maxLength={60}
            required
            className="w-full rounded-lg border border-line bg-card px-3 py-2 focus:border-leaf-deep focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-leaf-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>
      <button
        onClick={signOut}
        className="mt-12 text-sm font-semibold text-petal-deep hover:text-ink"
      >
        Sign out
      </button>
    </main>
  )
}
