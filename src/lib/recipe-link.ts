// Reading a recipe out of a web page (ADR-0015). Most recipe sites publish
// schema.org Recipe data as JSON-LD for search engines; that's exact, so
// it's tried first. Pages without it fall back to their visible text, which
// the AI extractor reads. Pure: no fetching here.

export type LinkedRecipe = {
  title: string
  servings: string | null
  attribution: string | null
  ingredients: string | null
  instructions: string | null
  notes: string | null
  /** The page's recipeCategory values ("Dessert", "Breakfast"), for filing. */
  categories: Array<string>
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
  ndash: '–',
  mdash: '—',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

/** Text with tags stripped and entities decoded, whitespace tidied. */
function clean(v: unknown): string {
  if (typeof v !== 'string') return ''
  return decodeEntities(v.replace(/<[^>]*>/g, ' '))
    .replace(/[ \t ]+/g, ' ')
    .trim()
}

function isRecipe(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== 'object') return false
  const type = (node as Record<string, unknown>)['@type']
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe'
}

/** Every object in a JSON-LD document, through arrays and @graph. */
function* walk(node: unknown): Generator<unknown> {
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n)
  } else if (node && typeof node === 'object') {
    yield node
    const graph = (node as Record<string, unknown>)['@graph']
    if (graph) yield* walk(graph)
  }
}

function findRecipe(html: string): Record<string, unknown> | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )
  for (const [, body] of scripts) {
    let data: unknown
    try {
      data = JSON.parse(body.trim())
    } catch {
      continue
    }
    for (const node of walk(data)) if (isRecipe(node)) return node
  }
  return null
}

function nameOf(v: unknown): string {
  if (typeof v === 'string') return clean(v)
  if (Array.isArray(v)) return v.map(nameOf).filter(Boolean).join(', ')
  if (v && typeof v === 'object')
    return clean((v as Record<string, unknown>).name)
  return ''
}

/** HowToStep / HowToSection / strings, flattened to paragraphs. */
function steps(v: unknown): Array<string> {
  if (typeof v === 'string') {
    return clean(v.replace(/<\/(p|li)>|<br\s*\/?>/gi, '\n'))
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(v)) return v.flatMap(steps)
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (o.itemListElement) {
      const inner = steps(o.itemListElement)
      const name = clean(o.name)
      return name ? [`${name}:`, ...inner] : inner
    }
    return steps(o.text ?? o.name)
  }
  return []
}

/** The page's schema.org Recipe, or null if it publishes none. */
export function recipeFromJsonLd(html: string): LinkedRecipe | null {
  const r = findRecipe(html)
  if (!r) return null
  const title = clean(r.name)
  const ingredients = (
    Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []
  )
    .map(clean)
    .filter(Boolean)
  const instructions = steps(r.recipeInstructions)
  if (!title && !ingredients.length && !instructions.length) return null
  const yieldValue = Array.isArray(r.recipeYield)
    ? r.recipeYield.map(clean).find((y) => /\D/.test(y)) ??
      clean(r.recipeYield[0])
    : clean(typeof r.recipeYield === 'number' ? String(r.recipeYield) : r.recipeYield)
  return {
    title: title.slice(0, 200),
    servings: yieldValue || null,
    attribution: nameOf(r.author) || null,
    ingredients: ingredients.length ? ingredients.join('\n') : null,
    instructions: instructions.length ? instructions.join('\n\n') : null,
    notes: clean(r.description) || null,
    categories: [r.recipeCategory, r.recipeCuisine]
      .flat()
      .map(clean)
      .filter(Boolean),
  }
}

/** A page's visible text, for the AI extractor when there's no JSON-LD. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|li|h[1-6]|tr|br)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && w !== 'and')
    .map((w) => w.replace(/(es|s)$/, ''))

/**
 * The section whose name shares a word with one of the categories
 * ("Dessert" → "Desserts", "Breakfast" → "Brunch and Breakfast"), or null.
 */
export function sectionForCategories(
  categories: Array<string>,
  sectionNames: Array<string>,
): string | null {
  const wanted = new Set(categories.flatMap(words))
  return sectionNames.find((n) => words(n).some((w) => wanted.has(w))) ?? null
}
