import { describe, test, expect } from 'bun:test'
import { db } from './connection'
import { sql } from 'drizzle-orm'
import {
  users,
  workspaces,
  workspaceMembers,
  projects,
  sprints,
  tasks,
  auditLogs,
  employeeCapacity,
} from './schema'

describe('Database connection', () => {
  test('can connect and execute a query', async () => {
    const result = await db.execute(sql`SELECT 1 as one`)
    // postgres.js returns rows directly as an array
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)
    expect((result[0] as { one: number }).one).toBe(1)
  })
})

describe('Migration verification', () => {
  test('all 8 tables exist in PostgreSQL', async () => {
    const result = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    const names = result.map((r: Record<string, unknown>) => r.table_name as string)
    const expected = ['audit_logs', 'employee_capacity', 'projects', 'sprints', 'tasks', 'users', 'workspace_members', 'workspaces']
    for (const table of expected) {
      expect(names).toContain(table)
    }
  })
})

describe('Schema tables', () => {
  const tableDefs = [
    { name: 'users', table: users },
    { name: 'workspaces', table: workspaces },
    { name: 'workspace_members', table: workspaceMembers },
    { name: 'projects', table: projects },
    { name: 'sprints', table: sprints },
    { name: 'tasks', table: tasks },
    { name: 'audit_logs', table: auditLogs },
    { name: 'employee_capacity', table: employeeCapacity },
  ]

  for (const { name, table } of tableDefs) {
    test(`table "${name}" is defined`, () => {
      expect(table).toBeDefined()
      expect(typeof table).toBe('object')
    })
  }
})
