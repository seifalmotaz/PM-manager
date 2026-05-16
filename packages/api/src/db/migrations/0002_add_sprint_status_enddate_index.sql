import { sql } from 'drizzle-orm'
import { db } from '../connection'

export async function up() {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_sprints_status_enddate
    ON sprints(status, end_date DESC)
  `)
}

export async function down() {
  await db.execute(sql`
    DROP INDEX IF EXISTS idx_sprints_status_enddate
  `)
}