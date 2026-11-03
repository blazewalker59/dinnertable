import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CopyButton } from '../components/CopyButton'
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from '../server/agents'

// Tokens that let a member's AI agent use the recipe book as them, over
// MCP at /mcp (ADR-0015).
export const Route = createFileRoute('/agents')({
  loader: () => listApiTokens(),
  component: AgentsPage,
})

function when(d: Date | string | null) {
  if (!d) return 'never used'
  return `used ${new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`
}

function AgentsPage() {
  const tokens = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('')
  const [canAdd, setCanAdd] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  // The address the page was opened at; the server can't know it.
  const [endpoint, setEndpoint] = useState('/mcp')
  useEffect(() => setEndpoint(`${window.location.origin}/mcp`), [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { token } = await createApiToken({ data: { name, canAdd } })
      setCreated(token)
      setName('')
      setCanAdd(false)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string, tokenName: string) {
    if (!confirm(`Revoke “${tokenName}”? Its agent stops working.`)) return
    await revokeApiToken({ data: id })
    await router.invalidate()
  }

  const token = created ?? 'dt_…'

  return (
    <main className="page max-w-2xl">
      <Link to="/profile" className="link -ml-2 px-2 font-normal">
        ← Your profile
      </Link>
      <h1 className="mt-2 mb-2 font-display text-3xl font-semibold tracking-tight">
        AI agents
      </h1>
      <p className="mb-6 text-ink-soft">
        Let your AI assistant (Claude, ChatGPT or your own bot) use the recipe
        book as you: look up recipes, pull their ingredients onto your grocery
        list and, if you allow it, add recipes from a link or a screenshot.
      </p>

      {created ? (
        <section
          role="status"
          className="mb-6 rounded-2xl border border-leaf bg-card p-4"
        >
          <h2 className="font-semibold">Your new token</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Copy it now: it won’t be shown again. Anyone with it can use the
            recipe book as you, so keep it in your agent’s settings only.
          </p>
          <code className="mt-3 block rounded-lg bg-cream px-3 py-2 font-mono text-sm break-all select-all">
            {created}
          </code>
          <div className="mt-2 flex gap-2">
            <CopyButton text={created} label="Copy token" />
            <button className="link px-2" onClick={() => setCreated(null)}>
              Done
            </button>
          </div>
        </section>
      ) : (
        <form
          onSubmit={create}
          className="mb-6 space-y-3 rounded-2xl border border-line bg-card p-4"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">New token</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              autoComplete="off"
              placeholder="What it’s for, e.g. Claude"
              className="field"
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={canAdd}
              onChange={(e) => setCanAdd(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-leaf-deep"
            />
            <span>
              <span className="font-semibold">Can add recipes</span>
              <span className="block text-sm text-ink-soft">
                From a link, a screenshot, or a recipe it reads to you. Added
                recipes show you as the person who added them.
              </span>
            </span>
          </label>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !name.trim()} className="btn-primary">
            {busy ? 'Creating…' : 'Create token'}
          </button>
        </form>
      )}

      <section className="mb-8 rounded-2xl border border-line bg-card p-4 text-sm">
        <h2 className="text-base font-semibold">Connect your agent</h2>
        <p className="mt-1 text-ink-soft">
          Add an MCP server with this URL, sending your token as a header:
        </p>
        <code className="mt-2 block rounded-lg bg-cream px-3 py-2 font-mono break-all">
          {endpoint}
        </code>
        <code className="mt-2 block rounded-lg bg-cream px-3 py-2 font-mono break-all">
          Authorization: Bearer {token}
        </code>
        <p className="mt-3 text-ink-soft">For Claude Code, run:</p>
        <code className="mt-1 block rounded-lg bg-cream px-3 py-2 font-mono break-all">
          claude mcp add --transport http dinnertable {endpoint} --header
          "Authorization: Bearer {token}"
        </code>
        <p className="mt-3 text-ink-soft">
          Then ask things like “add the ingredients for Mama’s pot roast to my
          grocery list”, or send it a recipe link or screenshot and ask it to
          save it.
        </p>
      </section>

      <h2 className="mb-2 font-display text-xl font-semibold">Your tokens</h2>
      {tokens.length === 0 ? (
        <p className="text-ink-soft">None yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{t.name}</span>
                  {t.scopes.includes('add') && (
                    <span className="shrink-0 rounded-full bg-leaf/30 px-2 py-0.5 text-xs font-semibold text-leaf-deep">
                      Can add
                    </span>
                  )}
                </span>
                <span className="block truncate text-sm text-ink-soft">
                  <span className="font-mono">{t.prefix}…</span> ·{' '}
                  {when(t.lastUsedAt)}
                </span>
              </span>
              <button
                onClick={() => revoke(t.id, t.name)}
                className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-petal-deep hover:text-ink"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
