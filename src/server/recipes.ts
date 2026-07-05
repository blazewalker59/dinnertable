import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db'
import { favorites, members, recipes, sections } from '../db/schema'
import { currentMember } from './auth'
import { imagesForRecipe } from './images-store'

export type RecipeFields = {
  title: string
  sectionId: number
  servings: string | null
  attribution: string | null
  ingredients: string | null
  instructions: string | null
  notes: string | null
}

// Only title is required (ADR-0003); blank optional fields become null.
function validateFields(input: RecipeFields): RecipeFields {
  const title = input.title.trim()
  if (!title) throw new Error('Title is required')
  const clean = (v: string | null) => {
    const t = v?.trim()
    return t ? t : null
  }
  return {
    title,
    sectionId: Number(input.sectionId),
    servings: clean(input.servings),
    attribution: clean(input.attribution),
    ingredients: clean(input.ingredients),
    instructions: clean(input.instructions),
    notes: clean(input.notes),
  }
}

// Every recipe query excludes soft-deleted rows (ADR-0007).
const notDeleted = isNull(recipes.deletedAt)

export const listSections = createServerFn().handler(async () => {
  await currentMember()
  const d = db()
  return d
    .select({
      id: sections.id,
      name: sections.name,
      recipeCount: count(recipes.id),
    })
    .from(sections)
    .leftJoin(recipes, and(eq(recipes.sectionId, sections.id), notDeleted))
    .groupBy(sections.id)
    .orderBy(asc(sections.sortOrder))
})

export const getSection = createServerFn()
  .inputValidator((id: number) => id)
  .handler(async ({ data: sectionId }) => {
    const me = await currentMember()
    const d = db()
    const [section] = await d
      .select()
      .from(sections)
      .where(eq(sections.id, sectionId))
    if (!section) throw new Response('Not found', { status: 404 })
    const sectionRecipes = await d
      .select({
        id: recipes.id,
        title: recipes.title,
        attribution: recipes.attribution,
        servings: recipes.servings,
        isFavorite: favorites.recipeId,
      })
      .from(recipes)
      .leftJoin(
        favorites,
        and(
          eq(favorites.recipeId, recipes.id),
          eq(favorites.memberId, me.id),
        ),
      )
      .where(and(eq(recipes.sectionId, sectionId), notDeleted))
      .orderBy(asc(recipes.title))
    return {
      section,
      recipes: sectionRecipes.map((r) => ({
        ...r,
        isFavorite: r.isFavorite != null,
      })),
    }
  })

export const getRecipe = createServerFn()
  .inputValidator((id: number) => id)
  .handler(async ({ data: recipeId }) => {
    const me = await currentMember()
    const d = db()
    const [row] = await d
      .select({
        recipe: recipes,
        sectionName: sections.name,
        addedBy: members.displayName,
      })
      .from(recipes)
      .innerJoin(sections, eq(sections.id, recipes.sectionId))
      .innerJoin(members, eq(members.id, recipes.addedById))
      .where(and(eq(recipes.id, recipeId), notDeleted))
    if (!row) throw new Response('Not found', { status: 404 })
    const [images, [fav]] = await Promise.all([
      imagesForRecipe(recipeId),
      d
        .select()
        .from(favorites)
        .where(
          and(
            eq(favorites.recipeId, recipeId),
            eq(favorites.memberId, me.id),
          ),
        ),
    ])
    return { ...row, images, isFavorite: !!fav }
  })

// FTS5 lives outside Drizzle's schema model (ADR-0006) — raw SQL seam.
export const searchRecipes = createServerFn()
  .inputValidator((q: string) => q.trim().slice(0, 100))
  .handler(async ({ data: q }) => {
    await currentMember()
    if (!q) return { query: q, results: [] }
    // Quote each term so user input can't inject FTS syntax; * = prefix match.
    const match = q
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t.replaceAll('"', '""')}"*`)
      .join(' ')
    const rows = await db().all<{
      id: number
      title: string
      attribution: string | null
      sectionId: number
      sectionName: string
    }>(sql`
      SELECT r.id, r.title, r.attribution,
             r.section_id AS sectionId, s.name AS sectionName
      FROM recipes_fts f
      JOIN recipes r ON r.id = f.rowid
      JOIN sections s ON s.id = r.section_id
      WHERE recipes_fts MATCH ${match}
        AND r.deleted_at IS NULL
      ORDER BY rank
      LIMIT 30
    `)
    return { query: q, results: rows }
  })

export const createRecipe = createServerFn({ method: 'POST' })
  .inputValidator(validateFields)
  .handler(async ({ data }) => {
    const me = await currentMember()
    const [created] = await db()
      .insert(recipes)
      .values({ ...data, addedById: me.id })
      .returning({ id: recipes.id })
    return created
  })

// Wiki-style: any member may edit or delete any recipe (ADR-0007).
export const updateRecipe = createServerFn({ method: 'POST' })
  .inputValidator((input: RecipeFields & { id: number }) => ({
    id: Number(input.id),
    ...validateFields(input),
  }))
  .handler(async ({ data: { id, ...fields } }) => {
    await currentMember()
    const [updated] = await db()
      .update(recipes)
      .set({ ...fields, updatedAt: sql`(unixepoch())` })
      .where(and(eq(recipes.id, id), notDeleted))
      .returning({ id: recipes.id })
    if (!updated) throw new Response('Not found', { status: 404 })
    return updated
  })

export const deleteRecipe = createServerFn({ method: 'POST' })
  .inputValidator((id: number) => Number(id))
  .handler(async ({ data: id }) => {
    await currentMember()
    const [deleted] = await db()
      .update(recipes)
      .set({ deletedAt: sql`(unixepoch())` })
      .where(and(eq(recipes.id, id), notDeleted))
      .returning({ sectionId: recipes.sectionId })
    if (!deleted) throw new Response('Not found', { status: 404 })
    return deleted
  })
