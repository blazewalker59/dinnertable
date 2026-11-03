import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
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
    <main className="page max-w-2xl">
      <Link to="/" className="link -ml-2 px-2 font-normal">
        ← All recipes
      </Link>
      <h1 className="mt-2 mb-2 font-display text-3xl font-semibold tracking-tight">
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
            className="field"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>
      <Link
        to="/agents"
        className="mt-10 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-leaf"
      >
        <span>
          <span className="block font-semibold">AI agents</span>
          <span className="block text-sm text-ink-soft">
            Let your assistant read recipes for your grocery list, or add them
          </span>
        </span>
        <span aria-hidden className="text-leaf-deep">
          →
        </span>
      </Link>
      <button
        onClick={signOut}
        className="mt-12 btn-danger"
      >
        Sign out
      </button>
    </main>
  )
}
