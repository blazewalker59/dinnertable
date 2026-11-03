import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [scanFiles, setScanFiles] = useState<Array<File>>([])
  const [attachPhoto, setAttachPhoto] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  // Pasted screenshots accumulate here (clipboard = one image per paste);
  // extraction runs when the member says they've got them all.
  const [pending, setPending] = useState<Array<File>>([])
  // What's being read right now, for the status card ("2 photos", "text").
  const [reading, setReading] = useState<string | null>(null)
  // Set once the member types in the form, so a finished scan asks before
  // replacing their edits.
  const formDirty = useRef(false)

  // One object URL per pending screenshot, revoked when the list changes.
  const previews = useMemo(
    () => pending.map((f) => URL.createObjectURL(f)),
    [pending],
  )
  useEffect(
    () => () => previews.forEach((u) => URL.revokeObjectURL(u)),
    [previews],
  )

  function applyDraft(extracted: ExtractedRecipe, sourceFiles: Array<File>) {
    if (
      formDirty.current &&
      !confirm('Replace what you typed with the scanned recipe?')
    )
      return
    formDirty.current = false
    setScanError(null)
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
    setScanFiles(sourceFiles)
    setDraftVersion((v) => v + 1)
  }

  async function busyWrap(what: string, fn: () => Promise<void>) {
    setScanning(true)
    setReading(what)
    setScanError(null)
    try {
      await fn()
    } catch (err) {
      setScanError(
        err instanceof Error ? err.message : 'Could not read that content',
      )
    } finally {
      setScanning(false)
      setReading(null)
      if (scanInput.current) scanInput.current.value = ''
    }
  }

  const scanImages = (files: Array<File>) =>
    busyWrap(
      files.length === 1 ? 'your photo' : `${files.length} photos`,
      async () => {
        if (files.length > 4) throw new Error('At most 4 images per scan')
        // Downscaled copies for the model; keep the originals for attaching.
        const form = new FormData()
        for (const file of files) {
          const { blob } = await rendition(file, 1600)
          form.append(
            'image',
            new File([blob], 'scan.jpg', { type: 'image/jpeg' }),
          )
        }
        applyDraft(await extractRecipe({ data: form }), files)
      },
    )

  function queuePasted(file: File) {
    setScanError(null)
    setPending((prev) => {
      if (prev.length >= 4) {
        setScanError('At most 4 images per scan')
        return prev
      }
      return [...prev, file]
    })
  }

  const scanText = (text: string) =>
    busyWrap('the pasted text', async () => {
      applyDraft(await extractRecipeText({ data: text }), [])
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
            queuePasted(new File([blob], 'clipboard.png', { type: imgType }))
            return
          }
        }
      }
      const text = await navigator.clipboard.readText().catch(() => '')
      if (text.trim()) {
        setPending([])
        await scanText(text)
        return
      }
      setScanError(
        'Nothing usable on the clipboard — copy a recipe photo or its text first.',
      )
    } catch {
      setScanError('Clipboard access was blocked — try “Take or choose photo”.')
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
      queuePasted(file)
      return
    }
    const text = e.clipboardData?.getData('text')
    if (text?.trim()) {
      e.preventDefault()
      setPending([])
      void scanText(text)
    }
  }
  useEffect(() => {
    const h = (e: ClipboardEvent) => pasteHandler.current(e)
    document.addEventListener('paste', h)
    return () => document.removeEventListener('paste', h)
  }, [])

  const hasDraft = draftVersion > 0

  return (
    <main className="page max-w-2xl">
      <h1 className="mb-4 font-display text-3xl font-semibold tracking-tight">
        Add a recipe
      </h1>

      <input
        ref={scanInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) =>
          e.target.files?.length && scanImages(Array.from(e.target.files))
        }
      />
      {hasDraft ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-1 text-sm text-ink-soft">
          Scan something else:
          <button
            onClick={() => scanInput.current?.click()}
            disabled={scanning}
            className="link px-2"
          >
            Photo
          </button>
          <button
            onClick={handlePasteButton}
            disabled={scanning}
            className="link px-2"
          >
            Paste
          </button>
        </div>
      ) : (
        <section className="mb-6 rounded-2xl border border-leaf bg-card p-4">
          <h2 className="font-semibold">✨ Start from a photo</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Snap a recipe card or screenshot and we'll fill in the form.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => scanInput.current?.click()}
              disabled={scanning}
              className="btn-secondary min-h-14 rounded-2xl text-base"
            >
              📷 Take or choose photo
            </button>
            <button
              onClick={handlePasteButton}
              disabled={scanning}
              className="btn-secondary min-h-14 rounded-2xl text-base"
            >
              📋 Paste screenshot
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-ink-soft">
            …or type it in yourself ↓
          </p>
        </section>
      )}

      {reading && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-leaf bg-card px-4 py-3"
        >
          <span
            aria-hidden
            className="size-5 shrink-0 animate-spin rounded-full border-2 border-leaf border-t-leaf-deep"
          />
          <span>
            <span className="font-semibold">Reading {reading}…</span>
            <span className="block text-sm text-ink-soft">
              Usually takes 5–15 seconds.
            </span>
          </span>
        </div>
      )}
      {scanError && (
        <p role="alert" className="mb-4 error-text">
          {scanError}
        </p>
      )}
      {pending.length > 0 && (
        <div className="mb-6 rounded-2xl border border-leaf bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {pending.map((_, i) => (
              <span key={previews[i]} className="relative">
                <img
                  src={previews[i]}
                  alt={`Screenshot ${i + 1}`}
                  className="size-16 rounded-lg border border-line object-cover"
                />
                <button
                  onClick={() =>
                    setPending((prev) => prev.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove screenshot ${i + 1}`}
                  className="absolute -top-2.5 -right-2.5 grid size-8 place-items-center rounded-full bg-white text-sm font-bold text-petal-deep shadow before:absolute before:-inset-1.5"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={async () => {
                const files = pending
                setPending([])
                await scanImages(files)
              }}
              disabled={scanning}
              className="btn-primary"
            >
              ✨ Read recipe ({pending.length})
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Paste again to add the next screenshot (up to 4), then read them
            together as one recipe.
          </p>
        </div>
      )}
      {hasDraft && !reading && (
        <div className="mb-6 rounded-2xl border border-leaf bg-card px-4 py-3 text-sm">
          <p className="font-semibold text-leaf-deep">
            Drafted for you — give it a once-over before saving.
          </p>
          {scanFiles.length > 0 && (
            <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 text-ink-soft">
              <input
                type="checkbox"
                checked={attachPhoto}
                onChange={(e) => setAttachPhoto(e.target.checked)}
                className="size-5 accent-leaf-deep"
              />
              Attach the{' '}
              {scanFiles.length === 1 ? 'photo' : `${scanFiles.length} photos`}{' '}
              to the recipe
            </label>
          )}
        </div>
      )}
      <RecipeForm
        key={draftVersion}
        sections={sections}
        initial={draft}
        submitLabel="Add recipe"
        locked={scanning}
        onEdit={() => {
          formDirty.current = true
        }}
        onCancel={() => navigate({ to: '/' })}
        onSubmit={async (fields) => {
          const { id } = await createRecipe({ data: fields })
          if (scanFiles.length > 0 && attachPhoto) {
            for (const [i, file] of scanFiles.entries()) {
              try {
                const [thumb, full] = await Promise.all([
                  rendition(file, 640),
                  rendition(file, 2200),
                ])
                const form = new FormData()
                form.set('recipeId', String(id))
                form.set('sortOrder', String(i))
                form.set(
                  'thumb',
                  new File([thumb.blob], 'thumb.jpg', { type: 'image/jpeg' }),
                )
                form.set(
                  'full',
                  new File([full.blob], 'full.jpg', { type: 'image/jpeg' }),
                )
                form.set('width', String(full.width))
                form.set('height', String(full.height))
                await uploadImage({ data: form })
              } catch {
                // Photo attach is best-effort; the recipe text is already saved.
              }
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
