// Agents over MCP (ADR-0015): make a token on the Agents page, use it at
// /mcp to read recipes and add one, then revoke it.
import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const fail = (msg) => {
  console.error('FAIL:', msg)
  process.exitCode = 1
}
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}

// Make an add-capable token
await goto('/agents')
await page.fill('input[placeholder^="What it"]', 'E2E Agent')
await page.check('text=Can add recipes')
await page.click('button:has-text("Create token")')
const token = (await page.locator('code.select-all').textContent({ timeout: 10000 })).trim()
if (!/^dt_[A-Za-z0-9_-]{43}$/.test(token)) fail('token shape: ' + token)
console.log('token created')

let id = 0
const rpc = async (method, params, t = token) => {
  const res = await fetch(base + '/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
  })
  return { status: res.status, body: res.status === 200 ? await res.json() : null }
}
const call = async (name, args) => {
  const { body } = await rpc('tools/call', { name, arguments: args })
  if (body.result.isError) throw new Error(`${name}: ${body.result.content[0].text}`)
  return body.result.structuredContent
}

const init = await rpc('initialize', { protocolVersion: '2025-06-18' })
if (init.body?.result?.serverInfo?.name !== 'dinnertable') fail('initialize')
const tools = (await rpc('tools/list')).body.result.tools.map((t) => t.name)
if (!tools.includes('add_recipe_from_link')) fail('tools: ' + tools)
console.log('initialize + tools/list ok:', tools.join(', '))

const found = await call('search_recipes', { query: 'chicken', limit: 3 })
if (!found.results.length) fail('search found nothing')
const ing = await call('get_ingredients', { recipeIds: found.results.map((r) => r.id) })
if (!ing.recipes[0].ingredients.length) fail('no ingredients')
console.log('search + get_ingredients ok:', ing.recipes.map((r) => r.title).join(', '))

const added = await call('add_recipe', {
  title: 'E2E Agent Soup',
  ingredients: 'Broth:\n4 cups stock\n1 onion',
  instructions: 'Simmer.\n\nServe.',
})
await goto(`/recipes/${added.id}`)
await page.waitForSelector('h1:has-text("E2E Agent Soup")', { timeout: 10000 })
await page.waitForSelector('text=4 cups stock', { timeout: 10000 })
console.log('add_recipe ok, page shows it')

// Clean up the added recipe
page.on('dialog', (d) => d.accept())
await goto(`/recipes/${added.id}/edit`)
await page.click('button:has-text("Delete recipe")')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })

// Revoke: the token stops working at once
await goto('/agents')
await page
  .locator('li', { hasText: 'E2E Agent' })
  .locator('button:has-text("Revoke")')
  .click()
await page.waitForSelector('li:has-text("E2E Agent")', { state: 'detached', timeout: 10000 })
const after = await rpc('tools/list')
if (after.status !== 401) fail('revoked token still works: ' + after.status)
console.log('revoke ok (401)')

await browser.close()
console.log(process.exitCode ? 'AGENTS E2E FAILED' : 'AGENTS E2E PASSED')
