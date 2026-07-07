import { useState } from 'react'
import type { RecipeFields } from '../server/recipes'
import { createSection } from '../server/sections'

const inputCls =
  'w-full rounded-lg border border-line bg-card px-3 py-2 focus:border-leaf-deep focus:outline-none'

export function RecipeForm({
  sections,
  initial,
  submitLabel,
  onSubmit,
}: {
  sections: Array<{ id: number; name: string }>
  initial?: Partial<RecipeFields>
  submitLabel: string
  onSubmit: (fields: RecipeFields) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Title *</span>
        <input name="title" defaultValue={initial?.title} required className={inputCls} />
      </label>
      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Section</span>
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
          <span className="mb-1 block text-sm font-semibold">Servings</span>
          <input
            name="servings"
            defaultValue={initial?.servings ?? ''}
            placeholder="4-6 servings"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Whose recipe?</span>
          <input
            name="attribution"
            defaultValue={initial?.attribution ?? ''}
            placeholder="Mama"
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Ingredients</span>
        <textarea
          name="ingredients"
          defaultValue={initial?.ingredients ?? ''}
          rows={8}
          placeholder={'One ingredient per line\n1 lb ground beef\n…'}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Instructions</span>
        <textarea
          name="instructions"
          defaultValue={initial?.instructions ?? ''}
          rows={8}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Notes &amp; stories</span>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ''}
          rows={3}
          placeholder="Mama would use a 9x13 casserole dish…"
          className={inputCls}
        />
      </label>
      {error && <p className="text-sm text-petal-deep">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-leaf-deep px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink disabled:opacity-50"
      >
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
