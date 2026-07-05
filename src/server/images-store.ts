// Server-only image helpers. Never import this from client components —
// files imported by the client may only export createServerFn wrappers.
import { env } from 'cloudflare:workers'
import { asc, eq } from 'drizzle-orm'
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
