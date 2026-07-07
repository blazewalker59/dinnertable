import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}
const search = async (q) => {
  await page.fill('input[role=combobox]', '')
  await page.fill('input[role=combobox]', q)
}

// Debounced inline results by ingredient phrase — no route change
await goto('/')
await search('picante sauce')
await page.waitForSelector('[role=listbox] >> text=Chicken Rice Burritos', { timeout: 10000 })
if (new URL(page.url()).pathname !== '/') throw new Error('search should not navigate')
console.log('inline results ok')

// Click a result → recipe page
await page.click('[role=listbox] >> text=Chicken Rice Burritos')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
await page.waitForSelector('h1:has-text("Chicken Rice Burritos")')
console.log('result click navigates ok')

// Keyboard: Enter picks first result
await search('spaghetti sauce')
await page.waitForSelector("[role=listbox] >> text=Mama's Spaghetti Sauce", { timeout: 10000 })
await page.press('input[role=combobox]', 'Enter')
await page.waitForSelector("h1:has-text(\"Mama's Spaghetti Sauce\")", { timeout: 15000 })
console.log('enter selects first result ok')

// Fresh writes reflect immediately (insert trigger)
await goto('/recipes/new')
await page.fill('input[name=title]', 'Search Trigger Dish')
await page.fill('textarea[name=ingredients]', '1 cup zanzibar dust')
await page.click('button[type=submit]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
const id = page.url().match(/(\d+)$/)[1]
await search('zanzibar')
await page.waitForSelector('[role=listbox] >> text=Search Trigger Dish', { timeout: 10000 })
console.log('insert trigger ok')

// Soft-deleted recipes drop out of results
page.on('dialog', (d) => d.accept())
await goto(`/recipes/${id}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })
await search('zanzibar')
await page.waitForSelector('[role=listbox] >> text=No recipes match', { timeout: 10000 })
console.log('soft-delete excluded ok')

await browser.close()
console.log('SEARCH E2E PASSED')
