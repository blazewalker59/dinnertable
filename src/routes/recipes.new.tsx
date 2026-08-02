import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { RecipeForm } from '../components/RecipeForm'
import { rendition } from '../lib/image-client'
import { extractRecipe, extractRecipeText } from '../server/ai'
import type { ExtractedRecipe } from '../server/ai'
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

  function applyDraft(extracted: ExtractedRecipe, sourceFile: File | null) {
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
    setScanFile(sourceFile)
    setDraftVersion((v) => v + 1)
  }

  async function busyWrap(fn: () => Promise<void>) {
    setScanning(true)
    setScanError(null)
    try {
      await fn()
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : 'Could not read that content',
      )
    } finally {
      setScanning(false)
      if (scanInput.current) scanInput.current.value = ''
    }
  }

  const scanImage = (file: File) =>
    busyWrap(async () => {
      // Downscaled copy for the model; keep the original for attaching.
      const { blob } = await rendition(file, 1600)
      const form = new FormData()
      form.set('image', new File([blob], 'scan.jpg', { type: 'image/jpeg' }))
      applyDraft(await extractRecipe({ data: form }), file)
    })

  const scanText = (text: string) =>
    busyWrap(async () => {
      applyDraft(await extractRecipeText({ data: text }), null)
    })

  async function handlePasteButton() {
    // Image on the clipboard wins; otherwise try text. clipboard.read()
    // needs a user gesture (this click) and may prompt on mobile.
    try {
      const items = await navigator.clipboard.read().catch(() => null)
      if (items) {
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'))
          if (imgType) {
            const blob = await item.getType(imgType)
            await scanImage(
              new File([blob], 'clipboard.png', { type: imgType }),
            )
            return
          }
        }
      }
      const text = await navigator.clipboard.readText().catch(() => '')
      if (text.trim()) {
        await scanText(text)
        return
      }
      setScanError(
        'Nothing usable on the clipboard — copy a recipe photo or its text first.',
      )
    } catch {
      setScanError('Clipboard access was blocked — try the Scan photo button.')
    }
  }

  // Desktop nicety: Cmd/Ctrl+V anywhere on the page (outside a form field)
  // runs the same extraction.
  const pasteHandler = useRef<(e: ClipboardEvent) => void>(() => {})
  pasteHandler.current = (e) => {
    const target = e.target as HTMLElement
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    )
      return
    const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
      f.type.startsWith('image/'),
    )
    if (file) {
      e.preventDefault()
      void scanImage(file)
      return
    }
    const text = e.clipboardData?.getData('text')
    if (text?.trim()) {
      e.preventDefault()
      void scanText(text)
    }
  }
  useEffect(() => {
    const h = (e: ClipboardEvent) => pasteHandler.current(e)
    document.addEventListener('paste', h)
    return () => document.removeEventListener('paste', h)
  }, [])

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Add a recipe
        </h1>
        <div className="flex gap-2">
          <input
            ref={scanInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && scanImage(e.target.files[0])}
          />
          <button
            onClick={() => scanInput.current?.click()}
            disabled={scanning}
            className="rounded-lg border border-leaf bg-card px-4 py-2 text-sm font-semibold text-leaf-deep transition hover:border-leaf-deep disabled:opacity-50"
          >
            {scanning ? 'Reading…' : '✨ Scan photo'}
          </button>
          <button
            onClick={handlePasteButton}
            disabled={scanning}
            className="rounded-lg border border-leaf bg-card px-4 py-2 text-sm font-semibold text-leaf-deep transition hover:border-leaf-deep disabled:opacity-50"
          >
            📋 Paste
          </button>
        </div>
      </div>
      {scanError && <p className="mb-4 text-sm text-petal-deep">{scanError}</p>}
      {draftVersion > 0 && !scanError && (
        <div className="mb-6 rounded-2xl border border-leaf bg-card px-4 py-3 text-sm">
          <p className="font-semibold text-leaf-deep">
            Drafted for you — give it a once-over before saving.
          </p>
          {scanFile && (
            <label className="mt-1 flex items-center gap-2 text-ink-soft">
              <input
                type="checkbox"
                checked={attachPhoto}
                onChange={(e) => setAttachPhoto(e.target.checked)}
              />
              Attach the photo to the recipe
            </label>
          )}
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
