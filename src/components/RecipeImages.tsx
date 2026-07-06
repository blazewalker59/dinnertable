import { useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { deleteImage, uploadImage } from '../server/images'

type ImageRow = { id: string; width: number | null; height: number | null }

// Downscale in the browser so 12MB phone photos never cross the wire
// (ADR-0004): a ~640px thumb for lists and a ~2200px full for card reading.
async function rendition(file: File, maxDim: number) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.85),
  )
  if (!blob) throw new Error('Could not process image')
  return { blob, width, height }
}

function Lightbox({
  images,
  index,
  onNavigate,
  onClose,
}: {
  images: Array<ImageRow>
  index: number
  onNavigate: (i: number) => void
  onClose: () => void
}) {
  const many = images.length > 1
  const prev = () => onNavigate((index - 1 + images.length) % images.length)
  const next = () => onNavigate((index + 1) % images.length)

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
      onClick={onClose}
    >
      <img
        src={`/img/${images[index].id}/full`}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] max-w-[94vw] rounded-lg object-contain shadow-2xl"
      />
      <button
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-cream/20 text-2xl text-cream transition hover:bg-cream/40"
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
          <span className="absolute bottom-4 rounded-full bg-cream/20 px-3 py-1 text-sm text-cream">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  )
}

export function RecipeImages({
  recipeId,
  images,
}: {
  recipeId: number
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
              alt=""
              className="mx-auto max-h-[28rem] w-auto object-contain py-3"
            />
          </button>
          <button
            onClick={() => handleDelete(hero.id)}
            aria-label="Remove photo"
            className="absolute top-3 right-3 hidden h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-petal-deep shadow group-hover:flex"
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
                  alt=""
                  loading="lazy"
                  className="h-24 w-24 rounded-xl border border-line object-cover"
                />
              </button>
              <button
                onClick={() => handleDelete(img.id)}
                aria-label="Remove photo"
                className="absolute top-1.5 right-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-petal-deep shadow group-hover:flex"
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
          className={
            hero
              ? 'text-sm font-semibold text-leaf-deep hover:text-ink disabled:opacity-50'
              : 'rounded-lg border border-leaf bg-card px-4 py-2 text-sm font-semibold text-leaf-deep transition hover:border-leaf-deep disabled:opacity-50'
          }
        >
          {busy ? 'Uploading…' : '+ Add a photo'}
        </button>
        {error && <p className="mt-2 text-sm text-petal-deep">{error}</p>}
      </div>

      {viewer != null && images[viewer] && (
        <Lightbox
          images={images}
          index={viewer}
          onNavigate={setViewer}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  )
}
