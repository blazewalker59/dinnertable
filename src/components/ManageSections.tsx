import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  createSection,
  deleteSection,
  renameSection,
} from '../server/sections'

const inputCls =
  'w-full rounded-lg border border-line bg-card px-3 py-1.5 text-sm focus:border-leaf-deep focus:outline-none'

export function ManageSections({
  sections,
}: {
  sections: Array<{ id: number; name: string; recipeCount: number }>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function act(fn: () => Promise<unknown>) {
    setError(null)
    try {
      await fn()
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md space-y-2 rounded-2xl border border-line bg-card px-5 py-4 text-left">
      <h2 className="mb-3 font-display text-lg font-semibold">Sections</h2>
      {sections.map((s) => (
        <form
          key={s.id}
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const name = new FormData(e.currentTarget).get('name') as string
            act(() => renameSection({ data: { id: s.id, name } }))
          }}
        >
          <input name="name" defaultValue={s.name} maxLength={60} className={inputCls} />
          <button
            type="submit"
            className="shrink-0 text-sm font-semibold text-leaf-deep hover:text-ink"
          >
            Rename
          </button>
          {s.recipeCount === 0 ? (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(
                    `Delete section "${s.name}"? Any recipes previously deleted from it will be permanently removed.`,
                  )
                )
                  act(() => deleteSection({ data: s.id }))
              }}
              className="shrink-0 text-sm font-semibold text-petal-deep hover:text-ink"
            >
              Delete
            </button>
          ) : (
            <span className="shrink-0 text-xs text-ink-soft">
              {s.recipeCount} {s.recipeCount === 1 ? 'recipe' : 'recipes'}
            </span>
          )}
        </form>
      ))}
      <form
        className="flex items-center gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const name = new FormData(form).get('name') as string
          act(async () => {
            await createSection({ data: name })
            form.reset()
          })
        }}
      >
        <input
          name="name"
          required
          maxLength={60}
          placeholder="New section name"
          className={inputCls}
        />
        <button
          type="submit"
          className="shrink-0 text-sm font-semibold text-leaf-deep hover:text-ink"
        >
          Add
        </button>
      </form>
      {error && <p className="text-sm text-petal-deep">{error}</p>}
    </div>
  )
}
