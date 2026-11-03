import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  createSection,
  deleteSection,
  renameSection,
} from '../server/sections'

// 16px on touch so iOS doesn't zoom into the field; compact with a mouse.
const inputCls = 'field text-base pointer-fine:text-sm'

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
          <input
            name="name"
            defaultValue={s.name}
            maxLength={60}
            aria-label={`Name of ${s.name}`}
            className={inputCls}
          />
          <button
            type="submit"
            className="link shrink-0 px-2"
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
              className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-petal-deep hover:text-ink"
            >
              Delete
            </button>
          ) : (
            <span className="shrink-0 px-2 text-xs text-ink-soft">
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
          className="link shrink-0 px-2"
        >
          Add
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}
