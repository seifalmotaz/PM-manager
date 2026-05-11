import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

// Admin connection (to create/drop test database)
const adminSql = postgres('postgres://postgres:password@localhost:5432/postgres', { max: 1 })

// Test database connection (set in beforeAll)
let testSql: ReturnType<typeof postgres>

describe('Database Schema', () => {
  beforeAll(async () => {
    // Drop test DB if it exists from a previous incomplete run
    await adminSql.unsafe(`DROP DATABASE IF EXISTS saha_test`)
    await adminSql.unsafe(`CREATE DATABASE saha_test`)
    // Close admin connection, open test connection
    await adminSql.end()
    testSql = postgres('postgres://postgres:password@localhost:5432/saha_test', { max: 1 })
    // Apply migrations using Drizzle's migrate function
    // Note: Bun test runs from project root, so we use workspace-relative path
    const testDb = drizzle(testSql)
    await migrate(testDb, { migrationsFolder: './packages/api/src/db/migrations' })
  })

  afterAll(async () => {
    await testSql.end()
    const adminSql2 = postgres('postgres://postgres:password@localhost:5432/postgres', { max: 1 })
    await adminSql2.unsafe(`DROP DATABASE IF EXISTS saha_test`)
    await adminSql2.end()
  })

  it('all expected tables exist', async () => {
    const result = await testSql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    const tables = result.map(r => r.table_name)
    expect(tables).toContain('users')
    expect(tables).toContain('workspaces')
    expect(tables).toContain('workspace_members')
    expect(tables).toContain('projects')
    expect(tables).toContain('sprints')
    expect(tables).toContain('tasks')
    expect(tables).toContain('audit_logs')
    expect(tables).toContain('employee_capacity')
  })

  it('users table has correct columns', async () => {
    const result = await testSql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns c
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    const cols = new Map(result.map(r => [r.column_name, r]))
    
    expect(cols.get('id').data_type).toBe('uuid')
    expect(cols.get('id').is_nullable).toBe('NO')
    expect(cols.get('email').data_type).toBe('text')
    expect(cols.get('email').is_nullable).toBe('NO')
    expect(cols.get('name').data_type).toBe('text')
    expect(cols.has('avatar_url')).toBe(true)
    expect(cols.has('created_at')).toBe(true)
    expect(cols.has('updated_at')).toBe(true)
  })

  it('users table has unique email constraint', async () => {
    const result = await testSql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'users' AND schemaname = 'public'
      AND indexname LIKE '%email%'
    `
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].indexdef).toContain('UNIQUE')
    expect(result[0].indexdef).toContain('email')
  })

  it('tasks table has correct foreign keys', async () => {
    const result = await testSql`
      SELECT kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'tasks'
    `
    const fks = new Map(result.map(r => [r.column_name, r.foreign_table_name]))
    expect(fks.get('project_id')).toBe('projects')
    expect(fks.get('assignee_id')).toBe('users')
    expect(fks.get('sprint_id')).toBe('sprints')
  })

  it('performance indexes exist', async () => {
    const result = await testSql`
      SELECT tablename, indexname FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `
    const indexes = result.map(r => `${r.tablename}:${r.indexname}`)
    // Check at least one index exists per required table/column combinations
    const hasIx = (table: string, col: string) => 
      indexes.some(ix => ix.startsWith(table + ':') && ix.toLowerCase().includes(col.toLowerCase()))
    
    expect(hasIx('tasks', 'project_id')).toBe(true)
    expect(hasIx('tasks', 'sprint_id')).toBe(true)
    expect(hasIx('tasks', 'assignee_id')).toBe(true)
    expect(hasIx('tasks', 'status')).toBe(true)
    expect(hasIx('tasks', 'completed_at')).toBe(true)
    expect(hasIx('sprints', 'project_id')).toBe(true)
    expect(hasIx('workspace_members', 'user_id')).toBe(true)
    expect(hasIx('employee_capacity', 'sprint_id')).toBe(true)
    expect(hasIx('audit_logs', 'entity_type')).toBe(true)
  })

  it('unique constraints are enforced', async () => {
    // Insert a user, then try inserting duplicate email
    await testSql`
      INSERT INTO users (id, email, name) 
      VALUES (gen_random_uuid(), 'duplicate@test.com', 'Test User')
    `
    try {
      await testSql`
        INSERT INTO users (id, email, name) 
        VALUES (gen_random_uuid(), 'duplicate@test.com', 'Test User 2')
      `
      expect.unreachable('Should have thrown unique constraint violation')
    } catch (e: any) {
      expect(e.message).toMatch(/duplicate|unique|already exists/i)
    }
  })
})