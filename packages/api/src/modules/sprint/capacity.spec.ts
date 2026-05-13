import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../db/connection'
import { tasks, employeeCapacity, workspaceMembers, users, workspaces, projects, sprints, auditLogs } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { capacityService } from './capacity.service'

describe('capacityService', () => {
  let testUserId: string
  let testUser2Id: string
  let testUser3Id: string
  let testWorkspaceId: string
  let testProjectId: string
  let sprintId: string

  beforeAll(async () => {
    // Create test user 1
    const [u1] = await db
      .insert(users)
      .values({
        email: `capacity-test-${Date.now()}@example.com`,
        name: 'Capacity Tester',
      })
      .returning()
    testUserId = u1.id

    // Create test user 2
    const [u2] = await db
      .insert(users)
      .values({
        email: `capacity-test2-${Date.now()}@example.com`,
        name: 'Team Member',
      })
      .returning()
    testUser2Id = u2.id

    // Create test user 3 (NOT a workspace member - for access tests)
    const [u3] = await db
      .insert(users)
      .values({
        email: `capacity-test3-${Date.now()}@example.com`,
        name: 'Outsider',
      })
      .returning()
    testUser3Id = u3.id

    // Create workspace
    const [ws] = await db
      .insert(workspaces)
      .values({
        name: 'Capacity Test WS',
        slug: `capacity-test-ws-${Date.now()}`,
        type: 'company',
        createdBy: testUserId,
      })
      .returning()
    testWorkspaceId = ws.id

    // Add user1 as owner
    await db.insert(workspaceMembers).values({
      workspaceId: testWorkspaceId,
      userId: testUserId,
      role: 'owner',
    })

    // Add user2 as member
    await db.insert(workspaceMembers).values({
      workspaceId: testWorkspaceId,
      userId: testUser2Id,
      role: 'member',
    })

    // Create project
    const [proj] = await db
      .insert(projects)
      .values({
        name: 'Capacity Test Project',
        workspaceId: testWorkspaceId,
      })
      .returning()
    testProjectId = proj.id

    // Create sprint
    const [spr] = await db
      .insert(sprints)
      .values({
        name: 'Capacity Sprint',
        projectId: testProjectId,
        startDate: new Date(Date.now() - 7 * 86400000),
        endDate: new Date(Date.now() + 7 * 86400000),
        status: 'active',
      })
      .returning()
    sprintId = spr.id

    // Insert tasks
    await db.insert(tasks).values({
      projectId: testProjectId,
      sprintId: sprintId,
      title: 'Task for User1',
      assigneeId: testUserId,
      estimatedHours: '8',
      status: 'in_progress',
    })

    await db.insert(tasks).values({
      projectId: testProjectId,
      sprintId: sprintId,
      title: 'Second task for User1',
      assigneeId: testUserId,
      estimatedHours: '16',
      status: 'todo',
    })

    await db.insert(tasks).values({
      projectId: testProjectId,
      sprintId: sprintId,
      title: 'Task for User2',
      assigneeId: testUser2Id,
      estimatedHours: '10',
      status: 'in_progress',
    })

    await db.insert(tasks).values({
      projectId: testProjectId,
      sprintId: sprintId,
      title: 'Null hours task',
      assigneeId: testUser2Id,
      estimatedHours: null,
      status: 'todo',
    })
  })

  afterAll(async () => {
    // Clean up in reverse dependency order
    await db.delete(tasks).where(eq(tasks.projectId, testProjectId))
    await db.delete(employeeCapacity).where(eq(employeeCapacity.sprintId, sprintId))
    await db.delete(sprints).where(eq(sprints.id, sprintId))
    await db.delete(projects).where(eq(projects.id, testProjectId))
    await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, testWorkspaceId))
    await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId))
    // Delete audit logs referencing these users before deleting users
    await db.delete(auditLogs).where(eq(auditLogs.userId, testUserId))
    await db.delete(auditLogs).where(eq(auditLogs.userId, testUser2Id))
    await db.delete(auditLogs).where(eq(auditLogs.userId, testUser3Id))
    await db.delete(users).where(eq(users.id, testUserId))
    await db.delete(users).where(eq(users.id, testUser2Id))
    await db.delete(users).where(eq(users.id, testUser3Id))
  })

  test('getCapacityTable returns all workspace members', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    expect(result.length).toBe(2)
    const userIds = result.map((r) => r.userId)
    expect(userIds).toContain(testUserId)
    expect(userIds).toContain(testUser2Id)
  })

  test('returns correct user names and emails', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    expect(user1Result?.user.name).toBe('Capacity Tester')
    expect(user1Result?.user.email).toContain('@example.com')
  })

  test('estimatedHours sums tasks for each member correctly', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    const user2Result = result.find((r) => r.userId === testUser2Id)
    // User1: 8 + 16 = 24h
    expect(user1Result?.estimatedHours).toBe(24)
    // User2: 10 + 0 (null) = 10h
    expect(user2Result?.estimatedHours).toBe(10)
  })

  test('taskCount is correct', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    const user2Result = result.find((r) => r.userId === testUser2Id)
    expect(user1Result?.taskCount).toBe(2)
    expect(user2Result?.taskCount).toBe(2)
  })

  test('task with null estimatedHours contributes 0', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user2Result = result.find((r) => r.userId === testUser2Id)
    // User2 has task with 10h and task with null hours = 10h total
    expect(user2Result?.estimatedHours).toBe(10)
  })

  test('capacityHours is null when no capacity set', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    const user2Result = result.find((r) => r.userId === testUser2Id)
    expect(user1Result?.capacityHours).toBeNull()
    expect(user2Result?.capacityHours).toBeNull()
  })

  test('isOverloaded is false when no capacity set', async () => {
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    const user2Result = result.find((r) => r.userId === testUser2Id)
    expect(user1Result?.isOverloaded).toBe(false)
    expect(user2Result?.isOverloaded).toBe(false)
  })

  test('setCapacity creates new capacity entry', async () => {
    const result = await capacityService.setCapacity(
      {
        sprintId,
        userId: testUserId,
        capacityHours: 40,
        note: 'Full time',
      },
      testUserId,
    )
    expect(result).toBeDefined()
    expect(result.capacityHours).toBe('40')
    expect(result.note).toBe('Full time')
  })

  test('setCapacity updates existing capacity entry', async () => {
    await capacityService.setCapacity(
      {
        sprintId,
        userId: testUserId,
        capacityHours: 50,
        note: 'Updated capacity',
      },
      testUserId,
    )
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    expect(user1Result?.capacityHours).toBe(50)
    expect(user1Result?.note).toBe('Updated capacity')
  })

  test('setCapacity writes audit log', async () => {
    await capacityService.setCapacity(
      {
        sprintId,
        userId: testUser2Id,
        capacityHours: 20,
        note: 'Capacity for user2',
      },
      testUserId,
    )
    const logs = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, 'sprint'), eq(auditLogs.entityId, sprintId), eq(auditLogs.field, 'capacity')))
    expect(logs.length).toBeGreaterThanOrEqual(1)
  })

  test('setCapacity throws BAD_REQUEST for non-workspace-member user', async () => {
    await expect(
      capacityService.setCapacity(
        {
          sprintId,
          userId: testUser3Id,
          capacityHours: 20,
        },
        testUserId,
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  test('overloadPercent calculates correctly when overloaded', async () => {
    await capacityService.setCapacity(
      {
        sprintId,
        userId: testUserId,
        capacityHours: 10,
      },
      testUserId,
    )
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    expect(user1Result?.isOverloaded).toBe(true)
    expect(user1Result?.overloadPercent).toBe(240) // 24 / 10 * 100 = 240
  })

  test('isOverloaded is false when estimatedHours <= capacityHours', async () => {
    await capacityService.setCapacity(
      {
        sprintId,
        userId: testUserId,
        capacityHours: 40,
      },
      testUserId,
    )
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user1Result = result.find((r) => r.userId === testUserId)
    expect(user1Result?.isOverloaded).toBe(false)
    expect(user1Result?.overloadPercent).toBe(60) // 24 / 40 * 100 = 60
  })

  test('overloadPercent is null when capacityHours is 0', async () => {
    await capacityService.setCapacity(
      {
        sprintId,
        userId: testUser2Id,
        capacityHours: 0,
      },
      testUserId,
    )
    const result = await capacityService.getCapacityTable(sprintId, testUserId)
    const user2Result = result.find((r) => r.userId === testUser2Id)
    expect(user2Result?.overloadPercent).toBeNull()
  })
})