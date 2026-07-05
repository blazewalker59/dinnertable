import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '../db'
import { favorites, recipes, sections } from '../db/schema'
import { currentMember } from './auth'

export const toggleFavorite = createServerFn({ method: 'POST' })
  .inputValidator((recipeId: number) => Number(recipeId))
  .handler(async ({ data: recipeId }) => {
    const me = await currentMember()
    const d = db()
    const where = and(
      eq(favorites.memberId, me.id),
      eq(favorites.recipeId, recipeId),
    )
    const [existing] = await d.select().from(favorites).where(where)
    if (existing) {
      await d.delete(favorites).where(where)
      return { favorited: false }
    }
    await d.insert(favorites).values({ memberId: me.id, recipeId })
    return { favorited: true }
  })

export const myFavorites = createServerFn().handler(async () => {
  const me = await currentMember()
  return db()
    .select({
      id: recipes.id,
      title: recipes.title,
      attribution: recipes.attribution,
      sectionName: sections.name,
    })
    .from(favorites)
    .innerJoin(
      recipes,
      and(eq(recipes.id, favorites.recipeId), isNull(recipes.deletedAt)),
    )
    .innerJoin(sections, eq(sections.id, recipes.sectionId))
    .where(eq(favorites.memberId, me.id))
    .orderBy(asc(recipes.title))
})
