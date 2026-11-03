import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'

// Better Auth core tables (v1.x, SQLite/D1 shape) — see ADR-0014. Hand-authored
// to the documented schema; verify against the installed version with
// `npm run auth:generate` and diff.
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .notNull()
    .default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', {
    mode: 'timestamp',
  }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', {
    mode: 'timestamp',
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

// See docs/DOMAIN.md — the app's own member concept, auto-provisioned from the
// Better Auth session by email (ADR-0014). Recipes/favorites reference this,
// not the auth user table.
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

// A member's heart on a recipe — the only social feature (ADR-0010).
export const favorites = sqliteTable(
  'favorites',
  {
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => recipes.id),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.recipeId] })],
)

// Card scans and dish photos (ADR-0004, amended): two client-generated
// renditions per image live in R2 at img/{id}/thumb and img/{id}/full.
export const recipeImages = sqliteTable('recipe_images', {
  id: text('id').primaryKey(),
  recipeId: integer('recipe_id')
    .notNull()
    .references(() => recipes.id),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  addedById: integer('added_by_id')
    .notNull()
    .references(() => members.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// API tokens a member makes for their AI agent, which reads (and, with the
// `add` scope, adds) recipes over MCP at /mcp as them (ADR-0015). Only the
// token's SHA-256 is stored.
export type TokenScope = 'read' | 'add'
export const apiTokens = sqliteTable(
  'api_tokens',
  {
    id: text('id').primaryKey(),
    memberId: integer('member_id')
      .notNull()
      .references(() => members.id),
    /** What the member called it ("Claude"). */
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    /** The token's first characters, to tell tokens apart on screen. */
    prefix: text('prefix').notNull(),
    /** `read` always; `add` lets its agent add recipes. */
    scopes: text('scopes', { mode: 'json' }).$type<Array<TokenScope>>().notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    /** Rate limit: a fixed one-minute window (unix seconds) and its count. */
    windowStart: integer('window_start').notNull().default(0),
    windowCount: integer('window_count').notNull().default(0),
  },
  (t) => [index('api_tokens_member_idx').on(t.memberId)],
)
