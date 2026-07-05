import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// See docs/DOMAIN.md — auto-provisioned from Cloudflare Access (ADR-0002).
export const members = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// See docs/DOMAIN.md — the single browsing axis (ADR-0006).
export const sections = sqliteTable('sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

// Free-text recipe model (ADR-0003): only title is required. attribution is
// provenance ("Mama", "Juli Alderman"); addedBy is who typed it in (ADR-0007).
export const recipes = sqliteTable('recipes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  sectionId: integer('section_id')
    .notNull()
    .references(() => sections.id),
  servings: text('servings'),
  attribution: text('attribution'),
  ingredients: text('ingredients'),
  instructions: text('instructions'),
  notes: text('notes'),
  addedById: integer('added_by_id')
    .notNull()
    .references(() => members.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})
