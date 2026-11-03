// A real database for server tests: every migration in drizzle/ applied to
// an in-memory SQLite (Node's built-in node:sqlite, which has FTS5), behind
// a small D1 binding shim, so Drizzle's D1 driver runs exactly as in the
// Worker (objects from .all(), arrays from .raw()).
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/db/schema'

const MIGRATIONS = join(process.cwd(), 'drizzle')

function d1Shim(sqlite: DatabaseSync) {
  const statement = (query: string, params: Array<SQLInputValue> = []) => ({
    bind: (...p: Array<SQLInputValue>) => statement(query, p),
    all: async () => ({
      results: sqlite.prepare(query).all(...params),
      success: true,
      meta: {},
    }),
    raw: async () => {
      const s = sqlite.prepare(query)
      s.setReturnArrays(true)
      return s.all(...params)
    },
    first: async (col?: string) => {
      const row = sqlite.prepare(query).get(...params) as
        | Record<string, unknown>
        | undefined
      return col ? (row?.[col] ?? null) : (row ?? null)
    },
    run: async () => {
      const r = sqlite.prepare(query).run(...params)
      return {
        success: true,
        meta: { changes: r.changes, last_row_id: r.lastInsertRowid },
      }
    },
  })
  return {
    prepare: (query: string) => statement(query),
    batch: async (stmts: Array<{ all: () => Promise<unknown> }>) =>
      Promise.all(stmts.map((s) => s.all())),
    exec: async (query: string) => {
      sqlite.exec(query)
      return { count: 1, duration: 0 }
    },
  }
}

export function sqliteDb() {
  const sqlite = new DatabaseSync(':memory:')
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    const text = readFileSync(join(MIGRATIONS, file), 'utf8')
    for (const stmt of text.split('--> statement-breakpoint')) {
      if (stmt.trim()) sqlite.exec(stmt)
    }
  }
  const db = drizzle(d1Shim(sqlite) as never, { schema })
  return { sqlite, db }
}
