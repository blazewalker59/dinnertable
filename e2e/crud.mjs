import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const fail = (msg) => {
  console.error('FAIL:', msg)
  process.exitCode = 1
}
// SSR page is interactive only after hydration; wait for idle before clicking
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}

// CREATE
await goto('/recipes/new')
await page.fill('input[name=title]', 'E2E Test Tacos')
await page.selectOption('select[name=sectionId]', '2')
await page.fill('input[name=attribution]', 'Test Kitchen')
await page.fill('textarea[name=ingredients]', 'tortillas\ncheese')
await page.click('button[type=submit]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
const recipeUrl = page.url()
const id = recipeUrl.match(/(\d+)$/)[1]
console.log('created recipe id', id)
await page.waitForSelector('h1:has-text("E2E Test Tacos")', { timeout: 10000 })
await page.waitForSelector('text=Test Kitchen', { timeout: 10000 })
console.log('create ok')

// EDIT (wiki-style)
await page.click('text=Edit')
await page.waitForURL(/\/edit$/)
await page.fill('input[name=title]', 'E2E Test Tacos (edited)')
await page.click('button[type=submit]')
await page.waitForURL(new RegExp(`/recipes/${id}$`))
await page.waitForSelector('h1:has-text("(edited)")', { timeout: 10000 })
console.log('edit ok')

// Title-only recipe (ADR-0003)
await goto('/recipes/new')
await page.fill('input[name=title]', 'Title Only Dish')
await page.click('button[type=submit]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
const id2 = page.url().match(/(\d+)$/)[1]
await page.waitForSelector('h1:has-text("Title Only Dish")', { timeout: 10000 })
console.log('title-only ok, id', id2)

// DELETE (soft)
page.on('dialog', (d) => d.accept())
await goto(`/recipes/${id}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/2$/, { timeout: 15000 })
await page.waitForSelector('h1:has-text("Soups and Dips")', { timeout: 10000 })
if ((await page.content()).includes('E2E Test Tacos')) fail('delete: still listed in section')
console.log('delete ok (gone from section list)')

// cleanup: soft-delete the title-only one too
await goto(`/recipes/${id2}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })

await browser.close()
console.log(process.exitCode ? 'E2E FAILED' : 'E2E PASSED')
