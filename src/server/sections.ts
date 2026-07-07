import { env } from 'cloudflare:workers'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm'
import { db } from '../db'
import { favorites, recipeImages, recipes, sections } from '../db/schema'
import { currentMember } from './auth'
import { r2Key } from './images-store'

// Sections are a family-editable list (ADR-0006); wiki-style trust applies
// (ADR-0007): any member can add, rename, or remove.

function validName(name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 60)
    throw new Error('Section name must be 1-60 characters')
  return trimmed
}

export const createSection = createServerFn({ method: 'POST' })
  .inputValidator(validName)
  .handler(async ({ data: name }) => {
    await currentMember()
    const [created] = await db()
      .insert(sections)
      .values({
        name,
        sortOrder: sql`(SELECT COALESCE(MAX(sort_order), 0) + 1 FROM sections)`,
      })
      .returning()
    return created
  })

export const renameSection = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: number; name: string }) => ({
    id: Number(input.id),
    name: validName(input.name),
  }))
  .handler(async ({ data }) => {
    await currentMember()
    const [updated] = await db()
      .update(sections)
      .set({ name: data.name })
      .where(eq(sections.id, data.id))
      .returning()
    if (!updated) throw new Response('Not found', { status: 404 })
    return updated
  })

// Deletable only when it has no live recipes. Soft-deleted recipes still
// reference the section (FK), so deleting the section purges that trash —
// their favorites, image rows, and R2 objects go with them.
export const deleteSection = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => Number(id))
  .handler(async ({ data: id }) => {
    await currentMember()
    const d = db()
    const [live] = await d
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.sectionId, id), isNull(recipes.deletedAt)))
      .limit(1)
    if (live) throw new Error('Section still has recipes')

    const trashed = await d
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(eq(recipes.sectionId, id), isNotNull(recipes.deletedAt)))
    if (trashed.length > 0) {
      const trashedIds = trashed.map((r) => r.id)
      const images = await d
        .select({ id: recipeImages.id })
        .from(recipeImages)
        .where(inArray(recipeImages.recipeId, trashedIds))
      await d.delete(favorites).where(inArray(favorites.recipeId, trashedIds))
      await d
        .delete(recipeImages)
        .where(inArray(recipeImages.recipeId, trashedIds))
      await d.delete(recipes).where(inArray(recipes.id, trashedIds))
      await Promise.all(
        images.flatMap((img) => [
          env.IMAGES.delete(r2Key(img.id, 'thumb')),
          env.IMAGES.delete(r2Key(img.id, 'full')),
        ]),
      )
    }

    await d.delete(sections).where(eq(sections.id, id))
    return { ok: true }
  })
