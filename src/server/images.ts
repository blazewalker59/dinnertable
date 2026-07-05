import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { recipeImages } from '../db/schema'
import { currentMember } from './auth'
import { r2Key } from './images-store'

export const uploadImage = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => {
    const recipeId = Number(data.get('recipeId'))
    const thumb = data.get('thumb')
    const full = data.get('full')
    if (!recipeId || !(thumb instanceof File) || !(full instanceof File))
      throw new Error('recipeId, thumb and full are required')
    return {
      recipeId,
      thumb,
      full,
      width: Number(data.get('width')) || null,
      height: Number(data.get('height')) || null,
    }
  })
  .handler(async ({ data }) => {
    const me = await currentMember()
    const id = crypto.randomUUID()
    await Promise.all([
      env.IMAGES.put(r2Key(id, 'thumb'), await data.thumb.arrayBuffer(), {
        httpMetadata: { contentType: data.thumb.type || 'image/jpeg' },
      }),
      env.IMAGES.put(r2Key(id, 'full'), await data.full.arrayBuffer(), {
        httpMetadata: { contentType: data.full.type || 'image/jpeg' },
      }),
    ])
    const [row] = await db()
      .insert(recipeImages)
      .values({
        id,
        recipeId: data.recipeId,
        width: data.width,
        height: data.height,
        addedById: me.id,
      })
      .returning()
    return row
  })

// Wiki-style: any member may remove any image (ADR-0007). Hard delete —
// unlike recipes, an image has no text history worth keeping.
export const deleteImage = createServerFn({ method: 'POST' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    await currentMember()
    await db().delete(recipeImages).where(eq(recipeImages.id, id))
    await Promise.all([
      env.IMAGES.delete(r2Key(id, 'thumb')),
      env.IMAGES.delete(r2Key(id, 'full')),
    ])
    return { ok: true }
  })
