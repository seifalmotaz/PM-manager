import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { setTimeout as sleep } from 'node:timers/promises'
import { db } from '../../db/connection'
import { auditLogs, users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from './audit.service'

let testUserId: string

beforeAll(async () => {
  // Create a test user for FK references
  const [user] = await db
    .insert(users)
    .values({
      email: `audit-test-${Date.now()}@example.com`,
      name: 'Audit Test User',
    })
    .returning({ id: users.id })
  testUserId = user.id
})

afterAll(async () => {
  // Clean up all audit logs for the test user (covers all entityIds)
  await db.delete(auditLogs).where(eq(auditLogs.userId, testUserId))

  // Clean up the test user
  await db.delete(users).where(eq(users.id, testUserId))
})

describe('createAuditLog', () => {
  test('creates a row in audit_logs with required fields', async () => {
    await createAuditLog({
      entityType: 'task',
      entityId: '00000000-0000-0000-0000-000000000001',
      action: 'created',
      userId: testUserId,
    })

    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, '00000000-0000-0000-0000-000000000001'))

    expect(rows.length).toBe(1)
    expect(rows[0].entityType).toBe('task')
    expect(rows[0].entityId).toBe('00000000-0000-0000-0000-000000000001')
    expect(rows[0].action).toBe('created')
    expect(rows[0].userId).toBe(testUserId)
    expect(rows[0].createdAt).toBeInstanceOf(Date)
  })

  test('stores optional field/oldValue/newValue', async () => {
    await createAuditLog({
      entityType: 'task',
      entityId: '00000000-0000-0000-0000-000000000002',
      action: 'updated',
      field: 'title',
      oldValue: 'Old Title',
      newValue: 'New Title',
      userId: testUserId,
    })

    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, '00000000-0000-0000-0000-000000000002'))

    expect(rows.length).toBe(1)
    expect(rows[0].field).toBe('title')
    expect(rows[0].oldValue).toBe('Old Title')
    expect(rows[0].newValue).toBe('New Title')
  })

  test('does NOT throw on DB write (fire-and-forget)', async () => {
    await expect(
      createAuditLog({
        entityType: 'task',
        entityId: '00000000-0000-0000-0000-000000000000',
        action: 'created',
        userId: testUserId,
      }),
    ).resolves.toBeUndefined()
  })
})

describe('auditFieldChange', () => {
  test('creates an audit entry with updated action and field info', async () => {
    auditFieldChange(
      'task',
      '00000000-0000-0000-0000-000000000003',
      testUserId,
      'priority',
      'p2',
      'p1',
    )

    // Wait for fire-and-forget async write to complete
    await sleep(100)

    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, '00000000-0000-0000-0000-000000000003'))

    expect(rows.length).toBe(1)
    expect(rows[0].action).toBe('updated')
    expect(rows[0].field).toBe('priority')
    expect(rows[0].oldValue).toBe('p2')
    expect(rows[0].newValue).toBe('p1')
  })

  test('converts non-string values via String()', async () => {
    auditFieldChange(
      'task',
      '00000000-0000-0000-0000-000000000004',
      testUserId,
      'storyPoints',
      5,
      8,
    )

    // Wait for fire-and-forget async write to complete
    await sleep(100)

    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, '00000000-0000-0000-0000-000000000004'))

    expect(rows.length).toBe(1)
    expect(rows[0].oldValue).toBe('5')
    expect(rows[0].newValue).toBe('8')
  })

  test('handles undefined oldValue', async () => {
    auditFieldChange(
      'task',
      '00000000-0000-0000-0000-000000000005',
      testUserId,
      'description',
      undefined,
      'new desc',
    )

    // Wait for fire-and-forget async write to complete
    await sleep(100)

    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, '00000000-0000-0000-0000-000000000005'))

    expect(rows.length).toBe(1)
    expect(rows[0].oldValue).toBeNull()
    expect(rows[0].newValue).toBe('new desc')
  })

  test('multiple entries are append-only for the same entity', async () => {
    auditFieldChange(
      'task',
      '00000000-0000-0000-0000-000000000006',
      testUserId,
      'status',
      'todo',
      'in_progress',
    )

    // Wait for first fire-and-forget write
    await sleep(50)

    auditFieldChange(
      'task',
      '00000000-0000-0000-0000-000000000006',
      testUserId,
      'status',
      'in_progress',
      'done',
    )

    // Wait for second fire-and-forget write
    await sleep(50)

    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, '00000000-0000-0000-0000-000000000006'))
      .orderBy(auditLogs.createdAt)

    expect(rows.length).toBe(2)

    // Append-only means first entry is earliest
    expect(rows[0].oldValue).toBe('todo')
    expect(rows[0].newValue).toBe('in_progress')
    expect(rows[1].oldValue).toBe('in_progress')
    expect(rows[1].newValue).toBe('done')
  })
})
