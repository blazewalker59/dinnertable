// Server-only recipe queries shared by the app's server functions and the
// agent tools (ADR-0015). Never import this from client components.
import { sql } from 'drizzle-orm'
import { db } from '../db'
import { recipes } from '../db/schema'
import type { RecipeFields } from '../lib/recipe-fields'

export type SearchRow = {
  id: number
  title: string
  attribution: string | null
  sectionId: number
  sectionName: string
}

// FTS5 lives outside Drizzle's schema model (ADR-0006) — raw SQL seam.
export async function searchRecipeRows(
  q: string,
  limit = 30,
): Promise<Array<SearchRow>> {
  // Quote each term so user input can't inject FTS syntax; * = prefix match.
  const match = q
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replaceAll('"', '""')}"*`)
    .join(' ')
  if (!match) return []
  return db().all<SearchRow>(sql`
    SELECT r.id, r.title, r.attribution,
           r.section_id AS sectionId, s.name AS sectionName
    FROM recipes_fts f
    JOIN recipes r ON r.id = f.rowid
    JOIN sections s ON s.id = r.section_id
    WHERE recipes_fts MATCH ${match}
      AND r.deleted_at IS NULL
    ORDER BY rank
    LIMIT ${limit}
  `)
}

/** Saves validated fields as a new recipe added by `memberId`. */
export async function insertRecipe(
  fields: RecipeFields,
  memberId: number,
): Promise<{ id: number }> {
  const [created] = await db()
    .insert(recipes)
    .values({ ...fields, addedById: memberId })
    .returning({ id: recipes.id })
  return created
}
