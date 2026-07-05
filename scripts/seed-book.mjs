// One-time book import (ADR-0008). Reads gitignored scripts/seed-data/book.json
// (transcribed from "Recipes from Mama.pdf") and emits SQL that wipes recipe
// data and inserts the full book. Run:
//   node scripts/seed-book.mjs > /tmp/seed.sql
//   npx wrangler d1 execute dinnertable --local  --file /tmp/seed.sql
//   npx wrangler d1 execute dinnertable --remote --file /tmp/seed.sql
import { readFileSync } from 'node:fs'

const { recipes } = JSON.parse(
  readFileSync(new URL('./seed-data/book.json', import.meta.url), 'utf8'),
)

const q = (v) => (v == null ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`)
const MEMBER = 'blazewalker59@gmail.com'

const lines = [
  // Fresh start: samples and test rows out, book in. Members are kept.
  'DELETE FROM favorites;',
  'DELETE FROM recipe_images;',
  'DELETE FROM recipes;',
  `INSERT INTO members (email, display_name) VALUES (${q(MEMBER)}, 'Blaze') ON CONFLICT(email) DO NOTHING;`,
]

for (const r of recipes) {
  lines.push(
    `INSERT INTO recipes (title, section_id, servings, attribution, ingredients, instructions, notes, added_by_id)
VALUES (${q(r.title)}, ${r.section}, ${q(r.servings)}, ${q(r.attribution)}, ${q(r.ingredients)}, ${q(r.instructions)}, ${q(r.notes)}, (SELECT id FROM members WHERE email = ${q(MEMBER)}));`,
  )
}

console.log(lines.join('\n'))
