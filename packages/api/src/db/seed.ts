import { sql } from './connection'

async function seed() {
  console.log('Seeding database...')
  // Phase 1: no seed data needed yet
  console.log('Seed complete.')
  await sql.end()
}

seed()