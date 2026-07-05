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
await page.waitForSelector('img[src^="/img/"]', { timeout: 30000 })
console.log('upload rendered in gallery')

// The thumb should actually serve bytes (authenticated same-origin route)
const src = await page.getAttribute('img[src^="/img/"]', 'src')
const res = await page.request.get(base + src)
if (!res.ok()) throw new Error('thumb fetch failed: ' + res.status())
const bytes = (await res.body()).length
console.log('thumb served,', bytes, 'bytes,', res.headers()['content-type'])
if (bytes < 1000) throw new Error('thumb suspiciously small')

// Full-res link exists and serves
const fullRes = await page.request.get(base + src.replace('/thumb', '/full'))
if (!fullRes.ok()) throw new Error('full fetch failed')
const fullBytes = (await fullRes.body()).length
console.log('full served,', fullBytes, 'bytes')
if (fullBytes <= bytes) throw new Error('full should be larger than thumb')

// Remove (any member, wiki-style)
page.on('dialog', (d) => d.accept())
await page.hover('figure')
await page.click('button[aria-label="Remove photo"]')
await page.waitForSelector('img[src^="/img/"]', { state: 'detached', timeout: 15000 })
const gone = await page.request.get(base + src)
if (gone.status() !== 404) throw new Error('deleted image still serves: ' + gone.status())
console.log('image removed; R2 object 404s')

// cleanup recipe
await goto(`/recipes/${id}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })

await browser.close()
console.log('IMAGES E2E PASSED')
