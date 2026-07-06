import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}

// Image-only recipe: title + photo, no text (ADR-0003)
await goto('/recipes/new')
await page.fill('input[name=title]', 'Image Only Card')
await page.click('button[type=submit]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
await page.waitForSelector('h1:has-text("Image Only Card")')
const id = page.url().match(/(\d+)$/)[1]
console.log('recipe created', id)

// Generate a big test "photo" in-page (3000x2000 canvas ≈ what a phone sends)
// and attach it to the hidden file input.
const png = await page.evaluate(async () => {
  const c = document.createElement('canvas')
  c.width = 3000
  c.height = 2000
  const g = c.getContext('2d')
  g.fillStyle = '#c2626f'
  g.fillRect(0, 0, 3000, 2000)
  g.fillStyle = '#fff'
  g.font = '200px serif'
  g.fillText('Recipe Card', 400, 1000)
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'))
  const buf = await blob.arrayBuffer()
  return Array.from(new Uint8Array(buf))
})
await page.setInputFiles('input[type=file]', {
  name: 'card.png',
  mimeType: 'image/png',
  buffer: Buffer.from(png),
})
// Hero renders the full rendition
await page.waitForSelector('img[src^="/img/"]', { timeout: 30000 })
console.log('hero rendered')

const fullSrc = await page.getAttribute('img[src^="/img/"]', 'src')
if (!fullSrc.endsWith('/full')) throw new Error('hero should use full rendition, got ' + fullSrc)
const thumbSrc = fullSrc.replace('/full', '/thumb')

// Both renditions serve bytes (authenticated same-origin route)
const thumbRes = await page.request.get(base + thumbSrc)
if (!thumbRes.ok()) throw new Error('thumb fetch failed: ' + thumbRes.status())
const thumbBytes = (await thumbRes.body()).length
const fullRes = await page.request.get(base + fullSrc)
if (!fullRes.ok()) throw new Error('full fetch failed')
const fullBytes = (await fullRes.body()).length
console.log('thumb', thumbBytes, 'bytes; full', fullBytes, 'bytes,', fullRes.headers()['content-type'])
if (thumbBytes < 1000) throw new Error('thumb suspiciously small')
if (fullBytes <= thumbBytes) throw new Error('full should be larger than thumb')

// Lightbox: opens in-app (no new tab), closes on Escape
await page.click('button[aria-label="View photo"]')
await page.waitForSelector('[role=dialog] img[src$="/full"]', { timeout: 10000 })
console.log('lightbox opens in-app')
await page.keyboard.press('Escape')
await page.waitForSelector('[role=dialog]', { state: 'detached', timeout: 10000 })
console.log('lightbox closes on Escape')

// Remove (any member, wiki-style) — deletes DB row and R2 objects
page.on('dialog', (d) => d.accept())
await page.hover('figure')
await page.click('button[aria-label="Remove photo"]')
await page.waitForSelector('img[src^="/img/"]', { state: 'detached', timeout: 15000 })
const gone = await page.request.get(base + fullSrc)
if (gone.status() !== 404) throw new Error('deleted image still serves: ' + gone.status())
console.log('image removed; R2 object 404s')

// cleanup recipe
await goto(`/recipes/${id}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })

await browser.close()
console.log('IMAGES E2E PASSED')
