import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sql } from './connection'

async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    console.log('Migrations applied successfully.')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigrations()