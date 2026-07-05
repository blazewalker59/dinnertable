import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}

// Heart a seeded recipe
await goto('/recipes/1')
await page.click('button[aria-label="Add to favorites"]')
await page.waitForSelector('button[aria-label="Remove from favorites"]', { timeout: 10000 })
console.log('heart on ok')

// Shows in My favorites
await goto('/favorites')
await page.waitForSelector("text=Mama's Spaghetti Sauce", { timeout: 10000 })
console.log('favorites list ok')

// Visible on section list
await goto('/sections/1')
await page.waitForSelector('span[aria-label="Favorited"]', { timeout: 10000 })
console.log('section heart mark ok')

// Toggle off persists
await goto('/recipes/1')
await page.click('button[aria-label="Remove from favorites"]')
await page.waitForSelector('button[aria-label="Add to favorites"]', { timeout: 10000 })
await goto('/favorites')
await page.waitForSelector('text=No favorites yet', { timeout: 10000 })
console.log('heart off ok')

await browser.close()
console.log('FAVORITES E2E PASSED')
