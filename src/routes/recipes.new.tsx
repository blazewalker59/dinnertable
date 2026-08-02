import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { RecipeForm } from '../components/RecipeForm'
import { rendition } from '../lib/image-client'
import { extractRecipe } from '../server/ai'
import { uploadImage } from '../server/images'
import { createRecipe, listSections } from '../server/recipes'
import type { RecipeFields } from '../server/recipes'

export const Route = createFileRoute('/recipes/new')({
  loader: () => listSections(),
  component: NewRecipe,
})

function NewRecipe() {
  const sections = Route.useLoaderData()
  const navigate = useNavigate()
  const scanInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<Partial<RecipeFields>>()
  const [draftVersion, setDraftVersion] = useState(0)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [attachPhoto, setAttachPhoto] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  async function handleScan(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setScanning(true)
    setScanError(null)
    try {
      // Downscaled copy for the model; keep the original for attaching.
      const { blob } = await rendition(file, 1600)
      const form = new FormData()
      form.set('image', new File([blob], 'scan.jpg', { type: 'image/jpeg' }))
      const extracted = await extractRecipe({ data: form })
      const section = sections.find((s) => s.name === extracted.sectionName)
      setDraft({
        title: extracted.title,
        sectionId: section?.id ?? sections[0]?.id,
        servings: extracted.servings,
        attribution: extracted.attribution,
        ingredients: extracted.ingredients,
        instructions: extracted.instructions,
        notes: extracted.notes,
      })
      setScanFile(file)
      setDraftVersion((v) => v + 1)
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : 'Could not read that image',
      )
    } finally {
      setScanning(false)
      if (scanInput.current) scanInput.current.value = ''
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Add a recipe
        </h1>
        <input
          ref={scanInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleScan(e.target.files)}
        />
        <button
          onClick={() => scanInput.current?.click()}
          disabled={scanning}
          className="rounded-lg border border-leaf bg-card px-4 py-2 text-sm font-semibold text-leaf-deep transition hover:border-leaf-deep disabled:opacity-50"
        >
          {scanning ? 'Reading photo…' : '✨ Scan from photo'}
        </button>
      </div>
      {scanError && <p className="mb-4 text-sm text-petal-deep">{scanError}</p>}
      {scanFile && (
        <div className="mb-6 rounded-2xl border border-leaf bg-card px-4 py-3 text-sm">
          <p className="font-semibold text-leaf-deep">
            Drafted from your photo — give it a once-over before saving.
          </p>
          <label className="mt-1 flex items-center gap-2 text-ink-soft">
            <input
              type="checkbox"
              checked={attachPhoto}
              onChange={(e) => setAttachPhoto(e.target.checked)}
            />
            Attach the photo to the recipe
          </label>
        </div>
      )}
      <RecipeForm
        key={draftVersion}
        sections={sections}
        initial={draft}
        submitLabel="Add recipe"
        onSubmit={async (fields) => {
          const { id } = await createRecipe({ data: fields })
          if (scanFile && attachPhoto) {
            try {
              const [thumb, full] = await Promise.all([
                rendition(scanFile, 640),
                rendition(scanFile, 2200),
              ])
              const form = new FormData()
              form.set('recipeId', String(id))
              form.set('thumb', new File([thumb.blob], 'thumb.jpg', { type: 'image/jpeg' }))
              form.set('full', new File([full.blob], 'full.jpg', { type: 'image/jpeg' }))
              form.set('width', String(full.width))
              form.set('height', String(full.height))
              await uploadImage({ data: form })
            } catch {
              // Photo attach is best-effort; the recipe text is already saved.
            }
          }
          await navigate({
            to: '/recipes/$recipeId',
            params: { recipeId: String(id) },
          })
        }}
      />
    </main>
  )
}
