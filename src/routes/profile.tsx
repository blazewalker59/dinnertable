import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { updateDisplayName } from '../server/members'

export const Route = createFileRoute('/profile')({
  component: Profile,
})

function Profile() {
  const { me } = Route.useRouteContext()
  const router = useRouter()
  const [name, setName] = useState(me.displayName)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Your profile</h1>
      <p className="mb-8 text-neutral-500">Signed in as {me.email}</p>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Display name</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            maxLength={60}
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </form>
    </main>
  )
}
