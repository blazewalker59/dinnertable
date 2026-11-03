import { createServerFn } from '@tanstack/react-start'
import { currentMember } from './auth'
import { extractFromImages, extractFromText } from './ai-extract'

// AI-assisted recipe capture (ADR-0009 fast-follow): a Workers AI model
// drafts the free-text fields from a photo/screenshot or copied text; the
// member reviews in the form before anything is saved.

export type { ExtractedRecipe } from './ai-extract'

export const extractRecipe = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => {
    const images = data.getAll('image').filter((v) => v instanceof File)
    if (images.length === 0) throw new Error('image is required')
    if (images.length > 4) throw new Error('At most 4 images per scan')
    return { images }
  })
  .handler(async ({ data }) => {
    await currentMember()
    return extractFromImages(
      await Promise.all(
        data.images.map(async (image) => ({
          type: image.type,
          bytes: await image.arrayBuffer(),
        })),
      ),
    )
  })

export const extractRecipeText = createServerFn({ method: 'POST' })
  .inputValidator((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) throw new Error('Nothing to extract')
    return trimmed.slice(0, 16000)
  })
  .handler(async ({ data: text }) => {
    await currentMember()
    return extractFromText(text)
  })
