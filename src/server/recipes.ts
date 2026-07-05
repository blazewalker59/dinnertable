import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { db } from '../db'
import { members, recipes, sections } from '../db/schema'
import { currentMember } from './auth'

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
    await currentMember()
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
      })
      .from(recipes)
      .where(and(eq(recipes.sectionId, sectionId), notDeleted))
      .orderBy(asc(recipes.title))
    return { section, recipes: sectionRecipes }
  })

export const getRecipe = createServerFn()
  .inputValidator((id: number) => id)
  .handler(async ({ data: recipeId }) => {
    await currentMember()
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
    return row
  })
