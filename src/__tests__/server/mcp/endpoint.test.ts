/**
 * /mcp end to end, in process: every migration on an in-memory SQLite, real
 * tokens, and JSON-RPC over Requests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from 'cloudflare:workers'
import { sqliteDb } from '@test/sqlite-db'

// vi.mock rather than MSW for the database (D1 via Drizzle, not HTTP) and
// for Workers AI (an env binding, not HTTP). Page and image fetches go
// through a stubbed global fetch.
const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/db', () => ({ db: () => state.db }))
const ai = vi.hoisted(() => ({
  extractFromImages: vi.fn(),
  extractFromText: vi.fn(),
}))
vi.mock('@/server/ai-extract', () => ai)

import { serveMcp } from '@/server/mcp/endpoint'
import { createToken } from '@/server/mcp/tokens'

const URL_ = 'https://dinnertable.cc/mcp'
let sqlite: ReturnType<typeof sqliteDb>['sqlite']
let readToken = ''
let addToken = ''
const r2 = new Map<string, ArrayBuffer>()

function post(body: unknown, token = readToken, headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

async function call(name: string, args: object = {}, token = readToken) {
  const res = await serveMcp(
    post(
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
      token,
    ),
  )
  const body = (await res.json()) as {
    result: { isError?: boolean; structuredContent?: any; content: Array<{ text: string }> }
  }
  return body.result
}

beforeEach(async () => {
  const made = sqliteDb()
  sqlite = made.sqlite
  state.db = made.db
  sqlite.exec(`
    INSERT INTO members (id, email, display_name) VALUES (1, 'b@example.com', 'Blaze'), (2, 'm@example.com', 'Mama');
    INSERT INTO sections (id, name, sort_order) VALUES (1, 'Mains', 0), (2, 'Desserts', 1);
    INSERT INTO recipes (id, title, section_id, servings, attribution, ingredients, instructions, added_by_id)
      VALUES (1, 'Pot Roast', 1, '6', 'Mama', 'Roast:\n3 lb chuck roast\n4 carrots\nGravy:\n2 T flour', '1. Sear.\n2. Braise 3 hrs.', 2),
             (2, 'Chicken Pie', 1, NULL, NULL, '2 cups chicken\n1 pie crust', 'Bake.', 1),
             (3, 'Fudge', 2, NULL, NULL, '1 can milk', NULL, 1);
    INSERT INTO recipes (id, title, section_id, added_by_id, deleted_at) VALUES (4, 'Old Chicken', 1, 1, 1);
    INSERT INTO favorites (member_id, recipe_id) VALUES (1, 3);
  `)
  readToken = (await createToken(1, 'Claude')).token
  addToken = (await createToken(1, 'Claude+', ['read', 'add'])).token
  r2.clear()
  ;(env as unknown as Record<string, unknown>).IMAGES = {
    put: async (key: string, bytes: ArrayBuffer) => void r2.set(key, bytes),
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  ai.extractFromImages.mockReset()
  ai.extractFromText.mockReset()
})

describe('/mcp requests', () => {
  it('turns away a request without a valid token', async () => {
    const none = await serveMcp(post({}, ''))
    expect(none.status).toBe(401)
    expect(none.headers.get('www-authenticate')).toMatch(/^Bearer/)
    expect((await serveMcp(post({}, 'dt_not-real'))).status).toBe(401)
  })

  it('refuses other methods and other sites', async () => {
    expect((await serveMcp(new Request(URL_))).status).toBe(405)
    expect(
      (await serveMcp(post({}, readToken, { origin: 'https://evil.example' })))
        .status,
    ).toBe(403)
  })

  it('answers malformed JSON with a parse error, notifications with 202', async () => {
    const bad = await serveMcp(
      new Request(URL_, {
        method: 'POST',
        headers: { authorization: `Bearer ${readToken}` },
        body: '{nope',
      }),
    )
    expect(bad.status).toBe(400)
    const note = await serveMcp(
      post({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    )
    expect(note.status).toBe(202)
  })

  it('offers add tools only to a token with the add scope', async () => {
    const names = async (token: string) => {
      const res = await serveMcp(
        post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token),
      )
      const body = (await res.json()) as { result: { tools: Array<{ name: string }> } }
      return body.result.tools.map((t) => t.name)
    }
    expect(await names(readToken)).toEqual([
      'search_recipes',
      'list_sections',
      'list_recipes',
      'get_recipe',
      'get_ingredients',
    ])
    expect(await names(addToken)).toContain('add_recipe_from_link')
    // The read token can't call it at all.
    const res = await serveMcp(
      post(
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'add_recipe', arguments: { title: 'X' } } },
        readToken,
      ),
    )
    expect(await res.json()).toMatchObject({ error: { code: -32602 } })
  })
})

describe('reading recipes', () => {
  it('searches by prefix, skipping deleted recipes, with links', async () => {
    const r = await call('search_recipes', { query: 'chick' })
    expect(r.structuredContent.results).toEqual([
      {
        id: 2,
        title: 'Chicken Pie',
        section: 'Mains',
        attribution: null,
        url: 'https://dinnertable.cc/recipes/2',
      },
    ])
  })

  it('lists sections with counts, and recipes by section or favorites', async () => {
    expect((await call('list_sections')).structuredContent.sections).toEqual([
      { id: 1, name: 'Mains', recipeCount: 2 },
      { id: 2, name: 'Desserts', recipeCount: 1 },
    ])
    const mains = (await call('list_recipes', { sectionId: 1 })).structuredContent
    expect(mains.recipes.map((r: { title: string }) => r.title)).toEqual([
      'Chicken Pie',
      'Pot Roast',
    ])
    const favs = (await call('list_recipes', { favoritesOnly: true })).structuredContent
    expect(favs.recipes.map((r: { title: string }) => r.title)).toEqual(['Fudge'])
  })

  it('gets a recipe with grouped ingredients and numbered steps', async () => {
    const r = (await call('get_recipe', { id: 1 })).structuredContent
    expect(r).toMatchObject({
      title: 'Pot Roast',
      section: 'Mains',
      servings: '6',
      attribution: 'Mama',
      addedBy: 'Mama',
      ingredients: [
        { group: 'Roast', items: ['3 lb chuck roast', '4 carrots'] },
        { group: 'Gravy', items: ['2 T flour'] },
      ],
      steps: ['Sear.', 'Braise 3 hrs.'],
      url: 'https://dinnertable.cc/recipes/1',
    })
    const missing = await call('get_recipe', { id: 4 })
    expect(missing).toMatchObject({ isError: true, content: [{ text: 'No recipe 4.' }] })
  })

  it('gathers ingredients for a grocery list across recipes', async () => {
    const r = (await call('get_ingredients', { recipeIds: [2, 3, 99] })).structuredContent
    expect(r.recipes).toEqual([
      expect.objectContaining({
        title: 'Chicken Pie',
        ingredients: [{ group: null, items: ['2 cups chicken', '1 pie crust'] }],
      }),
      expect.objectContaining({
        title: 'Fudge',
        ingredients: [{ group: null, items: ['1 can milk'] }],
      }),
    ])
    expect(r.notFound).toEqual([99])
  })
})

describe('adding recipes', () => {
  it('adds a recipe the agent read itself, as its member, flagging duplicates', async () => {
    const r = (
      await call(
        'add_recipe',
        {
          title: 'Fudge',
          sectionName: 'desserts',
          ingredients: '1 can milk\n2 cups sugar',
          instructions: 'Boil.\n\nBeat.',
          photos: [{ data: 'data:image/png;base64,aGVsbG8=' }],
        },
        addToken,
      )
    ).structuredContent
    expect(r).toMatchObject({
      title: 'Fudge',
      section: 'Desserts',
      photosAttached: 1,
      steps: ['Boil.', 'Beat.'],
      possibleDuplicates: [{ id: 3, title: 'Fudge' }],
    })
    const row = sqlite.prepare('SELECT section_id, added_by_id FROM recipes WHERE id = ?').get(r.id)
    expect(row).toEqual({ section_id: 2, added_by_id: 1 })
    expect(new TextDecoder().decode([...r2.values()][0])).toBe('hello')
  })

  it('says which sections exist when asked for one that does not', async () => {
    const r = await call('add_recipe', { title: 'Soup', sectionName: 'Soups' }, addToken)
    expect(r).toMatchObject({
      isError: true,
      content: [{ text: 'No section "Soups". Sections: Mains, Desserts.' }],
    })
  })

  it("adds from a link using the page's recipe data, keeping the source", async () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Recipe',
      name: 'Skillet Cornbread',
      recipeCategory: 'Dessert',
      recipeIngredient: ['1 cup cornmeal', '1 egg'],
      recipeInstructions: [{ '@type': 'HowToStep', text: 'Bake at 400.' }],
    })}</script>`
    const fetchMock = vi.fn(async () => new Response(html, { headers: { 'content-type': 'text/html' } }))
    vi.stubGlobal('fetch', fetchMock)
    const r = (
      await call('add_recipe_from_link', { url: 'https://food.example/cornbread' }, addToken)
    ).structuredContent
    expect(r).toMatchObject({
      title: 'Skillet Cornbread',
      section: 'Desserts',
      readVia: 'structured data',
      ingredients: [{ group: null, items: ['1 cup cornmeal', '1 egg'] }],
    })
    const notes = sqlite.prepare('SELECT notes FROM recipes WHERE id = ?').get(r.id) as { notes: string }
    expect(notes.notes).toBe('Source: https://food.example/cornbread')
    expect(ai.extractFromText).not.toHaveBeenCalled()
  })

  it('falls back to AI for a page without recipe data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(`<p>${'Grandma’s fudge. '.repeat(10)}</p>`)),
    )
    ai.extractFromText.mockResolvedValue({
      title: 'Grandma Fudge',
      servings: null,
      attribution: 'Grandma',
      ingredients: '1 can milk',
      instructions: null,
      notes: null,
      sectionName: 'Desserts',
    })
    const r = (
      await call('add_recipe_from_link', { url: 'https://blog.example/fudge' }, addToken)
    ).structuredContent
    expect(r).toMatchObject({ title: 'Grandma Fudge', section: 'Desserts', readVia: 'AI reading the page' })
  })

  it('explains when a site turns the reader away', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })))
    const r = await call('add_recipe_from_link', { url: 'https://strict.example/x' }, addToken)
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toMatch(/strict\.example answered 403.*screenshot/)
  })

  it('adds from images with the AI reader and keeps them as photos', async () => {
    ai.extractFromImages.mockResolvedValue({
      title: 'Card Cake',
      servings: null,
      attribution: 'Mama',
      ingredients: '2 eggs',
      instructions: 'Bake.',
      notes: null,
      sectionName: 'Desserts',
    })
    const r = (
      await call(
        'add_recipe_from_image',
        { images: [{ data: 'aGVsbG8=', mimeType: 'image/jpeg' }, { data: 'd29ybGQ=' }] },
        addToken,
      )
    ).structuredContent
    expect(ai.extractFromImages).toHaveBeenCalledWith([
      expect.objectContaining({ type: 'image/jpeg' }),
      expect.objectContaining({ type: 'image/jpeg' }),
    ])
    expect(r).toMatchObject({ title: 'Card Cake', section: 'Desserts', photosAttached: 2 })
    expect(sqlite.prepare('SELECT count(*) AS n FROM recipe_images').get()).toEqual({ n: 2 })
  })

  it('rejects an image given both ways', async () => {
    const r = await call(
      'add_recipe_from_image',
      { images: [{ data: 'aGVsbG8=', url: 'https://x.example/a.png' }] },
      addToken,
    )
    expect(r.isError).toBe(true)
    expect(r.content[0].text).toMatch(/either url or data/)
  })
})
