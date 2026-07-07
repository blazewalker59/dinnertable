import { chromium } from 'playwright-core'

const base = 'http://localhost:3000'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const goto = async (path) => {
  await page.goto(base + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
}
page.on('dialog', (d) => d.accept())

// Create a section inline from the recipe form
await goto('/recipes/new')
await page.fill('input[name=title]', 'Section Test Dish')
await page.selectOption('select[name=sectionId]', 'new')
await page.fill('input[name=newSectionName]', 'E2E Test Section')
await page.click('button[type=submit]')
await page.waitForURL(/\/recipes\/\d+$/, { timeout: 15000 })
const recipeId = page.url().match(/(\d+)$/)[1]
await page.waitForSelector('text=E2E Test Section', { timeout: 10000 })
console.log('inline section creation ok')

// New section appears on home
await goto('/')
await page.waitForSelector('text=E2E Test Section', { timeout: 10000 })

// Rename via manage panel
await page.click('text=Edit sections')
const row = page.locator('form', { has: page.locator('input[value="E2E Test Section"]') })
await row.locator('input[name=name]').fill('E2E Renamed Section')
await row.locator('button:has-text("Rename")').click()
await page.waitForSelector('a:has-text("E2E Renamed Section")', { timeout: 10000 })
console.log('rename ok')

// Empty the section, then delete it
await goto(`/recipes/${recipeId}/edit`)
await page.click('text=Delete')
await page.waitForURL(/\/sections\/\d+$/, { timeout: 15000 })
await goto('/')
await page.click('text=Edit sections')
const row2 = page.locator('form', { has: page.locator('input[value="E2E Renamed Section"]') })
await row2.locator('button:has-text("Delete")').click()
await page.waitForSelector('a:has-text("E2E Renamed Section")', { state: 'detached', timeout: 10000 })
console.log('delete empty section ok')

await browser.close()
console.log('SECTIONS E2E PASSED')
