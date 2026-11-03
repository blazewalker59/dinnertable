import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { rendition } from '../lib/image-client'
import { deleteImage, uploadImage } from '../server/images'

type ImageRow = { id: string; width: number | null; height: number | null }

function Lightbox({
  images,
  index,
  title,
  onNavigate,
  onClose,
  onDelete,
}: {
  images: Array<ImageRow>
  index: number
  title: string
  onNavigate: (i: number) => void
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const many = images.length > 1
  const prev = () => onNavigate((index - 1 + images.length) % images.length)
  const next = () => onNavigate((index + 1) % images.length)
  // Horizontal swipe to change photo (touch has no arrow keys).
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (many && e.key === 'ArrowLeft') prev()
      if (many && e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="lightbox-fade fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,28,24,0.93)]"
      onClick={() => {
        // A swipe that ends on the backdrop also fires a click; don't close.
        if (swiped.current) swiped.current = false
        else onClose()
      }}
      onPointerDown={(e) => {
        swipeStart.current = { x: e.clientX, y: e.clientY }
        swiped.current = false
      }}
      onPointerUp={(e) => {
        const start = swipeStart.current
        swipeStart.current = null
        if (!many || !start) return
        const dx = e.clientX - start.x
        const dy = e.clientY - start.y
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true
          if (dx < 0) next()
          else prev()
        }
      }}
    >
      <img
        src={`/img/${images[index].id}/full`}
        alt={`Photo ${index + 1} of ${title}`}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
      />
      <button
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute top-[max(env(safe-area-inset-top),1rem)] right-4 grid size-11 place-items-center rounded-full bg-cream/20 text-2xl text-cream transition hover:bg-cream/40"
      >
        ×
      </button>
      {many && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            aria-label="Previous photo"
            className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-cream/20 text-2xl text-cream transition hover:bg-cream/40"
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            aria-label="Next photo"
            className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-cream/20 text-2xl text-cream transition hover:bg-cream/40"
          >
            ›
          </button>
          <span className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-1/2 flex min-h-11 -translate-x-1/2 items-center rounded-full bg-cream/20 px-3 text-sm text-cream">
            {index + 1} / {images.length}
          </span>
        </>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(images[index].id)
        }}
        className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-cream/20 px-4 text-sm font-semibold text-cream transition hover:bg-cream/40"
      >
        Remove photo
      </button>
    </div>
  )
}

export function RecipeImages({
  recipeId,
  title,
  images,
}: {
  recipeId: number
  title: string
  images: Array<ImageRow>
}) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<number | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.set('recipeId', String(recipeId))
        try {
          const [thumb, full] = await Promise.all([
            rendition(file, 640),
            rendition(file, 2200),
          ])
          form.set('thumb', new File([thumb.blob], 'thumb.jpg', { type: 'image/jpeg' }))
          form.set('full', new File([full.blob], 'full.jpg', { type: 'image/jpeg' }))
          form.set('width', String(full.width))
          form.set('height', String(full.height))
        } catch {
          // Browser can't decode this format (e.g. HEIC on some platforms):
          // store the original untouched for both renditions.
          form.set('thumb', file)
          form.set('full', file)
        }
        await uploadImage({ data: form })
      }
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this photo?')) return
    await deleteImage({ data: id })
    setViewer(null)
    await router.invalidate()
  }

  const [hero, ...rest] = images

  return (
    <section className="mt-6">
      {hero && (
        <figure className="group relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-petal/40 via-card to-leaf/20">
          <button
            onClick={() => setViewer(0)}
            aria-label="View photo"
            className="block w-full cursor-zoom-in"
          >
            <img
              src={`/img/${hero.id}/full`}
              alt={`Photo of ${title}`}
              className="mx-auto max-h-[28rem] w-auto object-contain py-3"
            />
          </button>
          <button
            onClick={() => handleDelete(hero.id)}
            aria-label="Remove photo"
            className="absolute top-3 right-3 hidden size-9 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-petal-deep shadow pointer-fine:group-hover:flex"
          >
            ×
          </button>
        </figure>
      )}

      {rest.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {rest.map((img, i) => (
            <figure key={img.id} className="group relative shrink-0">
              <button
                onClick={() => setViewer(i + 1)}
                aria-label="View photo"
                className="block cursor-zoom-in"
              >
                <img
                  src={`/img/${img.id}/thumb`}
                  alt={`Photo ${i + 2} of ${title}`}
                  loading="lazy"
                  className="h-24 w-24 rounded-xl border border-line object-cover"
                />
              </button>
              <button
                onClick={() => handleDelete(img.id)}
                aria-label="Remove photo"
                className="absolute top-1.5 right-1.5 hidden size-7 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-petal-deep shadow pointer-fine:group-hover:flex"
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}

      <div className={hero ? 'mt-3' : ''}>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className={hero ? 'link' : 'btn-secondary'}
        >
          {busy ? 'Uploading…' : '+ Add a photo'}
        </button>
        {error && <p className="mt-2 error-text">{error}</p>}
      </div>

      {viewer != null && images[viewer] && (
        <Lightbox
          images={images}
          index={viewer}
          title={title}
          onNavigate={setViewer}
          onClose={() => setViewer(null)}
          onDelete={handleDelete}
        />
      )}
    </section>
  )
}
