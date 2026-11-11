import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const globalForDb = globalThis as typeof globalThis & { chessPool?: Pool }

const pool = globalForDb.chessPool ?? new Pool({ connectionString: process.env.DATABASE_URL })
if (process.env.NODE_ENV !== 'production') globalForDb.chessPool = pool

export const db = drizzle(pool, { schema })
