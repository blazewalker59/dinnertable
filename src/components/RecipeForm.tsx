import { useState } from 'react'
import type { RecipeFields } from '../server/recipes'
import { createSection } from '../server/sections'

const inputCls = 'field'
const labelCls = 'mb-1 block text-sm font-semibold'

export function RecipeForm({
  sections,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onEdit,
  locked = false,
}: {
  sections: Array<{ id: number; name: string }>
  initial?: Partial<RecipeFields>
  submitLabel: string
  onSubmit: (fields: RecipeFields) => Promise<void>
  /** Leave without saving; asks first if anything was typed. */
  onCancel: () => void
  /** Fires on the first edit, so a parent can tell the form is dirty. */
  onEdit?: () => void
  /** Read-only while something else is filling the form (e.g. an AI scan). */
  locked?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSection, setNewSection] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (k: string) => (f.get(k) as string) || null
    setBusy(true)
    setError(null)
    try {
      let sectionId = Number(f.get('sectionId'))
      if (f.get('sectionId') === 'new') {
        const created = await createSection({
          data: (f.get('newSectionName') as string) ?? '',
        })
        sectionId = created.id
      }
      await onSubmit({
        title: (f.get('title') as string) ?? '',
        sectionId,
        servings: str('servings'),
        attribution: str('attribution'),
        ingredients: str('ingredients'),
        instructions: str('instructions'),
        notes: str('notes'),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onInput={() => {
        if (!dirty) {
          setDirty(true)
          onEdit?.()
        }
      }}
    >
      <fieldset
        disabled={locked}
        aria-busy={locked}
        className={`space-y-5 transition-opacity ${locked ? 'opacity-60' : ''}`}
      >
        <label className="block">
          <span className={labelCls}>Title *</span>
          <input
            name="title"
            defaultValue={initial?.title}
            required
            className={inputCls}
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Section</span>
            <select
              name="sectionId"
              defaultValue={initial?.sectionId}
              onChange={(e) => setNewSection(e.target.value === 'new')}
              className={inputCls}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="new">+ New section…</option>
            </select>
            {newSection && (
              <input
                name="newSectionName"
                required
                autoFocus
                placeholder="Section name"
                maxLength={60}
                className={`mt-2 ${inputCls}`}
              />
            )}
          </label>
          <label className="block">
            <span className={labelCls}>Servings</span>
            <input
              name="servings"
              defaultValue={initial?.servings ?? ''}
              placeholder="4-6 servings"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Whose recipe?</span>
            <input
              name="attribution"
              defaultValue={initial?.attribution ?? ''}
              placeholder="Mama"
              className={inputCls}
            />
          </label>
        </div>
        <label className="block">
          <span className={labelCls}>Ingredients</span>
          <textarea
            name="ingredients"
            defaultValue={initial?.ingredients ?? ''}
            rows={8}
            placeholder={'One ingredient per line\n1 lb ground beef\n…'}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Instructions</span>
          <textarea
            name="instructions"
            defaultValue={initial?.instructions ?? ''}
            rows={8}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Notes &amp; stories</span>
          <textarea
            name="notes"
            defaultValue={initial?.notes ?? ''}
            rows={3}
            placeholder="Mama would use a 9x13 casserole dish…"
            className={inputCls}
          />
        </label>
      </fieldset>
      {error && <p className="mt-5 error-text">{error}</p>}
      {/* Pinned to the bottom so Save is reachable on long recipes. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex gap-3 border-t border-line bg-cream/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
        <button type="submit" disabled={busy || locked} className="btn-primary">
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!dirty || confirm('Discard your changes?')) onCancel()
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
