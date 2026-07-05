import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function db() {
  return drizzle(env.DB, { schema })
}
