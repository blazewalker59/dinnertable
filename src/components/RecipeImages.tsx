import { useRouter } from '@tanstack/react-router'
import { useRef, useState } from 'react'
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
    await router.invalidate()
  }

  return (
    <section className="mt-8">
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <figure key={img.id} className="group relative">
              <a href={`/img/${img.id}/full`} target="_blank" rel="noreferrer">
                <img
                  src={`/img/${img.id}/thumb`}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-xl border border-line object-cover"
                />
              </a>
              <button
                onClick={() => handleDelete(img.id)}
                aria-label="Remove photo"
                className="absolute top-2 right-2 hidden h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-petal-deep shadow group-hover:flex"
              >
                ×
              </button>
            </figure>
          ))}
        </div>
      )}
      <div className="mt-4">
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
          className="rounded-lg border border-leaf bg-card px-4 py-2 text-sm font-semibold text-leaf-deep transition hover:border-leaf-deep disabled:opacity-50"
        >
          {busy ? 'Uploading…' : '+ Add a photo'}
        </button>
        {error && <p className="mt-2 text-sm text-petal-deep">{error}</p>}
      </div>
    </section>
  )
}
