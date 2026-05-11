import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// Client for general queries
const client = postgres(connectionString, { max: 10 })
export const db = drizzle(client, { schema })

// Export for direct SQL access when needed
export { client as sql }