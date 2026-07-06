// One-time: upload the recipe-card scans in pics/ (gitignored family content)
// to R2 as thumb/full renditions and register recipe_images rows, matching
// what in-app uploads produce (ADR-0004 amendment). Usage:
//   node scripts/upload-card-photos.mjs           # local D1/R2
//   node scripts/upload-card-photos.mjs --remote  # production
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const REMOTE = process.argv.includes('--remote') ? ['--remote'] : ['--local']
const MEMBER_EMAIL = 'blazewalker59@gmail.com'

// filename (in pics/) -> [recipe title, sort order]
const MAP = {
  'aunt_carolyns_pound_cake.png': ["Aunt Carolyn's Pound Cake", 0],
  'baked_beans.png': ['Baked Beans', 0],
  'banana_bread.png': ["Mama's Banana Nut Bread", 0],
  'best_pumpkin_muffins_ever.png': ['Pumpkin Muffins', 0],
  'bills_beef_tips.png': ["Bill's Beef Tips", 0],
  'brownie_heath_trifle.png': ['Brownie Heath Trifle', 0],
  'caramel_cake.png': ['Caramel Cake', 0],
  'cheese_grits.png': ["Miss Missy's Cheese Grits", 0],
  'chicken_roll_ups.png': ['Chicken Roll Ups', 0],
  'coleslaw.png': ["Mama's Coleslaw", 0],
  'cornbread.png': ['Cornbread and Muffins', 0],
  'muffin_rolls.png': ['Cornbread and Muffins', 1],
  'country_ham_casserole.png': ['Country Ham and Cornbread Casserole', 0],
  'glory_crenshaw_snickerdoodle_cookies.png': ["Miss Glory's Snickerdoodles", 0],
  'graveyard_pudding.png': ['Graveyard Pudding', 0],
  'heavenly_hash_squares.png': ['Heavenly Hash Squares', 0],
  'hot_cocoa_from_scratch.png': ['Hot Cocoa', 0],
  'kitty_litter_cake.png': ['Kitty Litter Cake', 0],
  'kitty_litter_cake_2.png': ['Kitty Litter Cake', 1],
  'mac_n_cheese_1.png': ['Mac and Cheese 2 Ways', 0],
  'mac_n_cheese_karri.png': ['Mac and Cheese 2 Ways', 1],
  'mama_ruths_fried_chicken.png': ["Mama Ruth's Fried Chicken", 0],
  'miss_cyndis_gravy.png': ["Miss Cyndi's Easy Gravy", 0],
  'potato_salad.png': ['Potato Salad', 0],
  'quick_recipes.png': ['Cheeseburger Pie and More', 0],
  'redneck_caviar.png': ['Redneck Caviar', 0],
  'sour_cream_coffee_cake.png': ['Sour Cream Coffee Cake', 0],
  'stars_and_stripes_dessert_pizza.png': ['Stars and Stripes Dessert Pizza', 0],
  'sweet_potato_casserole.png': ['Sweet Potato Casserole', 0],
}

const wrangler = (args) =>
  execFileSync('npx', ['wrangler', ...args], { stdio: ['ignore', 'pipe', 'pipe'] })

const tmp = mkdtempSync(join(tmpdir(), 'dinnertable-cards-'))
const q = (v) => `'${String(v).replaceAll("'", "''")}'`
const sql = []

for (const [file, [title, sortOrder]] of Object.entries(MAP)) {
  const id = randomUUID()
  const src = sharp(join('pics', file)).rotate()
  // Same renditions the app's uploader produces: thumb ~640, full ~2200.
  const full = await src
    .clone()
    .resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true })
  const thumb = await src
    .clone()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true })

  const fullPath = join(tmp, `${id}-full.jpg`)
  const thumbPath = join(tmp, `${id}-thumb.jpg`)
  writeFileSync(fullPath, full.data)
  writeFileSync(thumbPath, thumb.data)

  for (const [size, path] of [['full', fullPath], ['thumb', thumbPath]]) {
    wrangler([
      'r2', 'object', 'put', `dinnertable-images/img/${id}/${size}`,
      `--file=${path}`, '--content-type=image/jpeg', ...REMOTE,
    ])
  }

  sql.push(
    `INSERT INTO recipe_images (id, recipe_id, width, height, sort_order, added_by_id)
SELECT ${q(id)}, r.id, ${full.info.width}, ${full.info.height}, ${sortOrder},
       (SELECT id FROM members WHERE email = ${q(MEMBER_EMAIL)})
FROM recipes r WHERE r.title = ${q(title)} AND r.deleted_at IS NULL;`,
  )
  console.log(`uploaded ${file} -> ${title} (${id})`)
}

const sqlPath = join(tmp, 'inserts.sql')
writeFileSync(sqlPath, sql.join('\n'))
wrangler(['d1', 'execute', 'dinnertable', `--file=${sqlPath}`, '-y', ...REMOTE])
console.log(`registered ${sql.length} recipe_images rows (${REMOTE[0]})`)
