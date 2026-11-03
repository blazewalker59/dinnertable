/**
 * What an agent can do with dinnertable (ADR-0015): find and read recipes,
 * gather ingredients for a grocery list and, with an `add` token, add
 * recipes (from fields it read itself, a link, or images). Server-only.
 */

import { and, asc, count, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../db'
import { favorites, members, recipes, sections } from '../../db/schema'
import { validateFields } from '../../lib/recipe-fields'
import {
  htmlToText,
  recipeFromJsonLd,
  sectionForCategories,
} from '../../lib/recipe-link'
import { parseIngredients, parseSteps } from '../../lib/recipe-text'
import { UserError } from '../../lib/user-error'
import { extractFromImages, extractFromText } from '../ai-extract'
import { storeImage } from '../images-store'
import { insertRecipe, searchRecipeRows } from '../recipe-store'
import { tool } from './protocol'
import type { McpTool } from './protocol'
import type { Caller } from './tokens'

export const INSTRUCTIONS =
  "dinnertable is a family's shared recipe book. Recipes are free text as the family wrote them: quantities, wording and quirks are theirs, so quote ingredients as written. To shop for a meal, find recipes (search_recipes, list_recipes) and pass their ids to get_ingredients, then add those items to the user's grocery list with whatever list tool you have (dinnertable has no grocery list of its own). Combine duplicate items across recipes, and ask before leaving out pantry staples. Link the user to a recipe with its url."

export const ADD_INSTRUCTIONS =
  "This token may also add recipes. If you can read a screenshot or photo yourself, transcribe it and use add_recipe (pass the image too, as a photo, if the user would like it kept). For a web link use add_recipe_from_link; for images you can't read, add_recipe_from_image. Each saves straight away and returns the recipe's url: tell the user it's there to check, and mention possibleDuplicates if any."

/** Images in: a public URL, or base64 data (with or without a data: URL). */
const ImageInput = z
  .object({
    url: z.url().optional().describe('An http(s) URL to fetch the image from.'),
    data: z
      .string()
      .optional()
      .describe('Base64 image bytes, or a data: URL.'),
    mimeType: z
      .string()
      .optional()
      .describe('e.g. image/jpeg, image/png. Default image/jpeg.'),
  })
  .refine((i) => Boolean(i.url) !== Boolean(i.data), {
    message: 'Give either url or data, not both.',
  })
type ImageInput = z.infer<typeof ImageInput>

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_PAGE_BYTES = 3 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000
// Recipe sites often turn away requests that don't look like a browser.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

/** GET an http(s) URL, refusing anything too large. */
async function fetchLimited(
  url: string,
  maxBytes: number,
  accept: string,
): Promise<{ bytes: ArrayBuffer; type: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new UserError(`Not a URL: ${url}`)
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
    throw new UserError('Only http(s) links can be fetched.')
  let res: Response
  try {
    res = await fetch(parsed, {
      headers: { accept, 'user-agent': BROWSER_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    throw new UserError(`Couldn't reach ${parsed.host}.`)
  }
  if (!res.ok) {
    throw new UserError(
      `${parsed.host} answered ${res.status}. Some sites block automated readers: send a screenshot instead, or read the page yourself and use add_recipe.`,
    )
  }
  const declared = Number(res.headers.get('content-length'))
  if (declared > maxBytes) throw new UserError('That file is too large.')
  const bytes = await res.arrayBuffer()
  if (bytes.byteLength > maxBytes) throw new UserError('That file is too large.')
  return {
    bytes,
    type: (res.headers.get('content-type') ?? '').split(';')[0].trim(),
  }
}

function base64ToBytes(b64: string): ArrayBuffer {
  let bin: string
  try {
    bin = atob(b64.replace(/\s+/g, ''))
  } catch {
    throw new UserError('Image data isn’t valid base64.')
  }
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

async function loadImage(
  i: ImageInput,
): Promise<{ bytes: ArrayBuffer; type: string }> {
  if (i.url) {
    const img = await fetchLimited(i.url, MAX_IMAGE_BYTES, 'image/*')
    if (img.type && !img.type.startsWith('image/'))
      throw new UserError(`${i.url} isn't an image (${img.type}).`)
    return { bytes: img.bytes, type: img.type || i.mimeType || 'image/jpeg' }
  }
  const dataUrl = /^data:([^;,]+)?(?:;base64)?,(.*)$/s.exec(i.data!)
  const bytes = base64ToBytes(dataUrl ? dataUrl[2] : i.data!)
  if (bytes.byteLength > MAX_IMAGE_BYTES)
    throw new UserError('That image is too large (8 MB at most).')
  return { bytes, type: dataUrl?.[1] || i.mimeType || 'image/jpeg' }
}

async function allSections() {
  return db()
    .select({ id: sections.id, name: sections.name })
    .from(sections)
    .orderBy(asc(sections.sortOrder), asc(sections.id))
}

/**
 * The section to file a recipe in: the one asked for (by name, any case),
 * else the suggested one, else the first.
 */
async function resolveSection(
  asked: string | undefined,
  suggested?: string | null,
): Promise<{ id: number; name: string }> {
  const list = await allSections()
  if (list.length === 0) throw new UserError('The recipe book has no sections yet.')
  const find = (n?: string | null) =>
    n ? list.find((s) => s.name.toLowerCase() === n.trim().toLowerCase()) : undefined
  if (asked) {
    const s = find(asked)
    if (!s)
      throw new UserError(
        `No section "${asked}". Sections: ${list.map((x) => x.name).join(', ')}.`,
      )
    return s
  }
  return find(suggested) ?? list[0]
}

/** Recipes with the same title (case-insensitive), so the agent can warn. */
async function sameTitle(title: string, exceptId: number) {
  const rows = await db()
    .select({ id: recipes.id, title: recipes.title })
    .from(recipes)
    .where(
      and(
        sql`lower(${recipes.title}) = lower(${title})`,
        isNull(recipes.deletedAt),
        sql`${recipes.id} <> ${exceptId}`,
      ),
    )
  return rows
}

export function dinnertableTools(caller: Caller, origin: string): Array<McpTool> {
  const urlOf = (id: number) => `${origin}/recipes/${id}`
  const read = readTools(caller, urlOf)
  return caller.scopes.includes('add')
    ? [...read, ...addTools(caller, urlOf)]
    : read
}

function readTools(caller: Caller, urlOf: (id: number) => string): Array<McpTool> {
  return [
    tool({
      name: 'search_recipes',
      title: 'Search recipes',
      description:
        'Full-text search over titles, ingredients, instructions, notes and whose recipe it is. Matches word prefixes ("chick" finds chicken). Returns ids to pass to get_recipe or get_ingredients.',
      input: z.object({
        query: z.string().trim().min(1).max(100),
        limit: z.number().int().min(1).max(30).default(10),
      }),
      call: async ({ query, limit }) => ({
        results: (await searchRecipeRows(query, limit)).map((r) => ({
          id: r.id,
          title: r.title,
          section: r.sectionName,
          attribution: r.attribution,
          url: urlOf(r.id),
        })),
      }),
    }),
    tool({
      name: 'list_sections',
      title: 'Recipe sections',
      description: 'The recipe book’s sections, with how many recipes each holds.',
      input: z.object({}),
      call: async () => ({
        sections: await db()
          .select({
            id: sections.id,
            name: sections.name,
            recipeCount: count(recipes.id),
          })
          .from(sections)
          .leftJoin(
            recipes,
            and(eq(recipes.sectionId, sections.id), isNull(recipes.deletedAt)),
          )
          .groupBy(sections.id)
          .orderBy(asc(sections.sortOrder), asc(sections.id)),
      }),
    }),
    tool({
      name: 'list_recipes',
      title: 'List recipes',
      description: `Recipes by title: all of them, one section's, or only the favorites of ${caller.memberName} (the person this token belongs to).`,
      input: z.object({
        sectionId: z.number().int().optional(),
        favoritesOnly: z.boolean().default(false),
      }),
      call: async ({ sectionId, favoritesOnly }) => {
        const filters = [
          isNull(recipes.deletedAt),
          sectionId === undefined ? undefined : eq(recipes.sectionId, sectionId),
          favoritesOnly ? eq(favorites.memberId, caller.memberId) : undefined,
        ]
        const base = db()
          .select({
            id: recipes.id,
            title: recipes.title,
            section: sections.name,
            attribution: recipes.attribution,
          })
          .from(recipes)
          .innerJoin(sections, eq(sections.id, recipes.sectionId))
        const rows = await (favoritesOnly
          ? base.innerJoin(favorites, eq(favorites.recipeId, recipes.id))
          : base
        )
          .where(and(...filters))
          .orderBy(asc(recipes.title))
        return { recipes: rows.map((r) => ({ ...r, url: urlOf(r.id) })) }
      },
    }),
    tool({
      name: 'get_recipe',
      title: 'Get a recipe',
      description:
        'One recipe in full: servings, whose it is, ingredients (grouped under any sub-headings like "Frosting"), numbered steps, the family’s notes, and its url.',
      input: z.object({ id: z.number().int() }),
      call: async ({ id }) => {
        const [row] = await db()
          .select({
            recipe: recipes,
            section: sections.name,
            addedBy: members.displayName,
          })
          .from(recipes)
          .innerJoin(sections, eq(sections.id, recipes.sectionId))
          .innerJoin(members, eq(members.id, recipes.addedById))
          .where(and(eq(recipes.id, id), isNull(recipes.deletedAt)))
        if (!row) throw new UserError(`No recipe ${id}.`)
        const r = row.recipe
        return {
          id: r.id,
          title: r.title,
          section: row.section,
          servings: r.servings,
          attribution: r.attribution,
          addedBy: row.addedBy,
          ingredients: groupIngredients(r.ingredients),
          steps: parseSteps(r.instructions),
          notes: r.notes,
          url: urlOf(r.id),
        }
      },
    }),
    tool({
      name: 'get_ingredients',
      title: 'Ingredients for a grocery list',
      description:
        'The ingredients of up to 20 recipes at once, for building a grocery list: each recipe’s title, servings and ingredient lines exactly as written (quantities included), grouped by recipe. Combine duplicates yourself.',
      input: z.object({
        recipeIds: z.array(z.number().int()).min(1).max(20),
      }),
      call: async ({ recipeIds }) => {
        const rows = await db()
          .select({
            id: recipes.id,
            title: recipes.title,
            servings: recipes.servings,
            ingredients: recipes.ingredients,
          })
          .from(recipes)
          .where(
            and(
              sql`${recipes.id} IN (${sql.join(
                recipeIds.map((i) => sql`${i}`),
                sql`, `,
              )})`,
              isNull(recipes.deletedAt),
            ),
          )
        const byId = new Map(rows.map((r) => [r.id, r]))
        return {
          recipes: recipeIds.flatMap((id) => {
            const r = byId.get(id)
            if (!r) return []
            return [
              {
                id: r.id,
                title: r.title,
                servings: r.servings,
                ingredients: groupIngredients(r.ingredients),
                url: urlOf(r.id),
              },
            ]
          }),
          notFound: recipeIds.filter((id) => !byId.has(id)),
        }
      },
    }),
  ]
}

/** Ingredient lines under their sub-headings (group null before any). */
export function groupIngredients(text: string | null) {
  const groups: Array<{ group: string | null; items: Array<string> }> = []
  for (const line of parseIngredients(text)) {
    if (line.kind === 'heading') groups.push({ group: line.text, items: [] })
    else {
      if (groups.length === 0) groups.push({ group: null, items: [] })
      groups[groups.length - 1].items.push(line.text)
    }
  }
  return groups.filter((g) => g.items.length > 0)
}

const OptionalFields = {
  sectionName: z
    .string()
    .max(60)
    .optional()
    .describe(
      'Section to file it in (see list_sections). Pass one when you know the dish: otherwise it goes in the best guess, or the first section.',
    ),
}

function addTools(caller: Caller, urlOf: (id: number) => string): Array<McpTool> {
  /** Save a recipe, attach any photos, and report it with duplicates. */
  async function save(
    fields: {
      title: string
      servings?: string | null
      attribution?: string | null
      ingredients?: string | null
      instructions?: string | null
      notes?: string | null
    },
    section: { id: number; name: string },
    photos: Array<{ bytes: ArrayBuffer; type: string }>,
  ) {
    let valid
    try {
      valid = validateFields({
        title: fields.title,
        sectionId: section.id,
        servings: fields.servings ?? null,
        attribution: fields.attribution ?? null,
        ingredients: fields.ingredients ?? null,
        instructions: fields.instructions ?? null,
        notes: fields.notes ?? null,
      })
    } catch (e) {
      throw new UserError(e instanceof Error ? e.message : 'Invalid recipe')
    }
    const { id } = await insertRecipe(valid, caller.memberId)
    for (const [i, photo] of photos.entries()) {
      // One original stands in for both renditions (no resizing here).
      await storeImage({
        recipeId: id,
        memberId: caller.memberId,
        thumb: photo,
        full: photo,
        sortOrder: i,
      })
    }
    const dupes = await sameTitle(valid.title, id)
    return {
      id,
      title: valid.title,
      section: section.name,
      url: urlOf(id),
      photosAttached: photos.length,
      ingredients: groupIngredients(valid.ingredients),
      steps: parseSteps(valid.instructions),
      ...(dupes.length
        ? {
            possibleDuplicates: dupes.map((d) => ({ ...d, url: urlOf(d.id) })),
          }
        : {}),
    }
  }

  return [
    tool({
      name: 'add_recipe',
      title: 'Add a recipe',
      description:
        'Add a recipe you have already read (from a screenshot, photo, message or page). Only title is required. Write ingredients one per line, with sub-headings ending in ":" (e.g. "Frosting:"); instructions as paragraphs, blank lines between steps. Optionally attach the original image(s) as photos.',
      input: z.object({
        title: z.string().trim().min(1).max(200),
        servings: z.string().max(100).optional(),
        attribution: z
          .string()
          .max(100)
          .optional()
          .describe('Whose recipe it is, e.g. "Mama" or the site or author.'),
        ingredients: z.string().max(20_000).optional(),
        instructions: z.string().max(40_000).optional(),
        notes: z
          .string()
          .max(10_000)
          .optional()
          .describe('Tips or stories, and the source link if there is one.'),
        ...OptionalFields,
        photos: z.array(ImageInput).max(4).optional(),
      }),
      call: async ({ sectionName, photos, ...fields }) => {
        const section = await resolveSection(sectionName)
        const loaded = await Promise.all((photos ?? []).map(loadImage))
        return save(fields, section, loaded)
      },
    }),
    tool({
      name: 'add_recipe_from_link',
      title: 'Add a recipe from a link',
      description:
        "Fetch a recipe web page and add it. Reads the page's structured recipe data where it has some (most recipe sites do), else has dinnertable's AI read the page text. The link is kept in the recipe's notes.",
      input: z.object({
        url: z.url(),
        ...OptionalFields,
      }),
      call: async ({ url, sectionName }) => {
        const page = await fetchLimited(
          url,
          MAX_PAGE_BYTES,
          'text/html,application/xhtml+xml',
        )
        const html = new TextDecoder().decode(page.bytes)
        const linked = recipeFromJsonLd(html)
        let found: {
          title: string
          servings: string | null
          attribution: string | null
          ingredients: string | null
          instructions: string | null
          notes: string | null
          sectionName?: string | null
        } | null = linked && {
          ...linked,
          sectionName: sectionForCategories(
            linked.categories,
            (await allSections()).map((x) => x.name),
          ),
        }
        const via = found ? 'structured data' : 'AI reading the page'
        if (!found) {
          const text = htmlToText(html)
          if (text.length < 50)
            throw new UserError(
              "That page has almost no text (it may need JavaScript). Send a screenshot instead.",
            )
          try {
            found = await extractFromText(text)
          } catch (error) {
            console.error('mcp add_recipe_from_link: extraction failed', error)
            throw new UserError(
              "Couldn't find a recipe on that page. Send a screenshot instead.",
            )
          }
        }
        const section = await resolveSection(sectionName, found.sectionName)
        const notes = [found.notes, `Source: ${url}`].filter(Boolean).join('\n\n')
        const { title, servings, attribution, ingredients, instructions } = found
        return {
          ...(await save(
            { title, servings, attribution, ingredients, instructions, notes },
            section,
            [],
          )),
          readVia: via,
        }
      },
    }),
    tool({
      name: 'add_recipe_from_image',
      title: 'Add a recipe from images',
      description:
        "Have dinnertable's AI read a recipe from 1–4 images (a card's front and back, or a long screenshot in parts, in order) and add it, keeping the images as photos unless attachPhotos is false. If you can read the images yourself, add_recipe is usually more accurate.",
      input: z.object({
        images: z.array(ImageInput).min(1).max(4),
        attachPhotos: z.boolean().default(true),
        ...OptionalFields,
      }),
      call: async ({ images, attachPhotos, sectionName }) => {
        const loaded = await Promise.all(images.map(loadImage))
        let found
        try {
          found = await extractFromImages(loaded)
        } catch (error) {
          console.error('mcp add_recipe_from_image: extraction failed', error)
          throw new UserError(
            "Couldn't read a recipe from those images. Try a clearer or smaller screenshot, or read it yourself and use add_recipe.",
          )
        }
        const section = await resolveSection(sectionName, found.sectionName)
        return save(found, section, attachPhotos ? loaded : [])
      },
    }),
  ]
}
