import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}

// Heart the first recipe in the first section
await goto('/sections/1')
await page.click('ul a[href^="/recipes/"]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
await page.waitForTimeout(1000)
const title = (await page.textContent('h1')).trim()
const recipePath = new URL(page.url()).pathname
await page.click('button[aria-label="Add to favorites"]')
await page.waitForSelector('button[aria-label="Remove from favorites"]', { timeout: 10000 })
console.log('heart on ok:', title)

// Shows in My favorites
await goto('/favorites')
await page.waitForSelector(`text=${title}`, { timeout: 10000 })
console.log('favorites list ok')

// Visible on section list
await goto('/sections/1')
await page.waitForSelector('span[aria-label="Favorited"]', { timeout: 10000 })
console.log('section heart mark ok')

// Toggle off persists
await goto(recipePath)
await page.click('button[aria-label="Remove from favorites"]')
await page.waitForSelector('button[aria-label="Add to favorites"]', { timeout: 10000 })
await goto('/favorites')
await page.waitForSelector('text=No favorites yet', { timeout: 10000 })
console.log('heart off ok')

await browser.close()
console.log('FAVORITES E2E PASSED')
