// Server-only image helpers. Never import this from client components —
// files imported by the client may only export createServerFn wrappers.
import { env } from 'cloudflare:workers'
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { recipeImages } from '../db/schema'

export const r2Key = (id: string, size: 'thumb' | 'full') => `img/${id}/${size}`

export async function imagesForRecipe(recipeId: number) {
  return db()
    .select()
    .from(recipeImages)
    .where(eq(recipeImages.recipeId, recipeId))
    .orderBy(asc(recipeImages.sortOrder), asc(recipeImages.createdAt))
}

export async function getImageResponse(imageId: string, size: string) {
  if (size !== 'thumb' && size !== 'full')
    return new Response('Not found', { status: 404 })
  const obj = await env.IMAGES.get(r2Key(imageId, size))
  if (!obj) return new Response('Not found', { status: 404 })
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: obj.httpEtag,
    },
  })
}

/** Adds each recipe's first photo id (for list thumbnails), or null. */
export async function withFirstImage<T extends { id: number }>(
  rows: Array<T>,
): Promise<Array<T & { imageId: string | null }>> {
  const ids = rows.map((r) => r.id)
  const images = ids.length
    ? await db()
        .select({ id: recipeImages.id, recipeId: recipeImages.recipeId })
        .from(recipeImages)
        .where(inArray(recipeImages.recipeId, ids))
        .orderBy(asc(recipeImages.sortOrder), asc(recipeImages.createdAt))
    : []
  const firstImage = new Map<number, string>()
  for (const img of images)
    if (!firstImage.has(img.recipeId)) firstImage.set(img.recipeId, img.id)
  return rows.map((r) => ({ ...r, imageId: firstImage.get(r.id) ?? null }))
}

/** Stores a recipe photo's two renditions in R2 and records it. */
export async function storeImage(input: {
  recipeId: number
  memberId: number
  thumb: { bytes: ArrayBuffer; type: string }
  full: { bytes: ArrayBuffer; type: string }
  width?: number | null
  height?: number | null
  sortOrder?: number
}) {
  const id = crypto.randomUUID()
  await Promise.all([
    env.IMAGES.put(r2Key(id, 'thumb'), input.thumb.bytes, {
      httpMetadata: { contentType: input.thumb.type || 'image/jpeg' },
    }),
    env.IMAGES.put(r2Key(id, 'full'), input.full.bytes, {
      httpMetadata: { contentType: input.full.type || 'image/jpeg' },
    }),
  ])
  const [row] = await db()
    .insert(recipeImages)
    .values({
      id,
      recipeId: input.recipeId,
      width: input.width ?? null,
      height: input.height ?? null,
      sortOrder: input.sortOrder ?? 0,
      addedById: input.memberId,
    })
    .returning()
  return row
}
