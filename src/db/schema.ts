import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// See docs/DOMAIN.md — the single browsing axis (ADR-0006).
export const sections = sqliteTable('sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})
