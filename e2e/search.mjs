import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}

// Seeded content is findable by ingredient phrase
await goto('/search?q=picante+sauce')
await page.waitForSelector('text=Chicken Rice Burritos', { timeout: 10000 })
console.log('ingredient search ok')

// Header search box navigates
await goto('/')
await page.fill('input[name=q]', 'spaghetti')
await page.press('input[name=q]', 'Enter')
await page.waitForURL(/\/search\?q=spaghetti/, { timeout: 15000 })
await page.waitForSelector("text=Mama's Spaghetti Sauce", { timeout: 10000 })
console.log('header search ok')

// Fresh writes reflect immediately (insert trigger)
await goto('/recipes/new')
await page.fill('input[name=title]', 'Search Trigger Dish')
await page.fill('textarea[name=ingredients]', '1 cup zanzibar dust')
await page.click('button[type=submit]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
const id = page.url().match(/(\d+)$/)[1]
await goto('/search?q=zanzibar')
await page.waitForSelector('text=Search Trigger Dish', { timeout: 10000 })
console.log('insert trigger ok')

// Soft-deleted recipes drop out of results
page.on('dialog', (d) => d.accept())
await goto(`/recipes/${id}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })
await goto('/search?q=zanzibar')
await page.waitForSelector('text=No recipes match', { timeout: 10000 })
console.log('soft-delete excluded ok')

await browser.close()
console.log('SEARCH E2E PASSED')
