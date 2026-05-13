import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers, projects, sprints, tasks, auditLogs } from '../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { sprintService } from './sprint.service'

let testUserId: string
let testUser2Id: string
let testWorkspaceId: string
let testProjectId: string

beforeAll(async () => {
  // Create test user
  const [user] = await db
    .insert(users)
    .values({ email: `sprint-test-${Date.now()}@example.com`, name: 'Sprint Test User' })
    .returning()
  testUserId = user.id

  // Create second user (non-member for access tests)
  const [user2] = await db
    .insert(users)
    .values({ email: `sprint-test2-${Date.now()}@example.com`, name: 'Sprint Test User 2' })
    .returning()
  testUser2Id = user2.id

  // Create a test workspace
  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: 'Sprint Test Workspace',
      slug: `sprint-test-ws-${Date.now()}`,
      type: 'company',
      createdBy: testUserId,
    })
    .returning()
  testWorkspaceId = workspace.id

  // Add test user as member
  await db.insert(workspaceMembers).values({
    workspaceId: testWorkspaceId,
    userId: testUserId,
    role: 'owner',
  })

  // Create a test project
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: testWorkspaceId,
      name: 'Sprint Test Project',
      description: 'Project for sprint tests',
    })
    .returning()
  testProjectId = project.id
})

afterAll(async () => {
  // Clean up in reverse dependency order
  await db.delete(auditLogs).where(eq(auditLogs.userId, testUserId))
  await db.delete(auditLogs).where(eq(auditLogs.userId, testUser2Id))

  // Delete tasks for our test project
  await db.delete(tasks).where(eq(tasks.projectId, testProjectId))

  // Delete sprints for our test project
  await db.delete(sprints).where(eq(sprints.projectId, testProjectId))

  // Delete project
  await db.delete(projects).where(eq(projects.id, testProjectId))

  // Delete workspace members
  await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, testWorkspaceId))

  // Delete workspace
  await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId))

  // Delete users
  await db.delete(users).where(eq(users.id, testUserId))
  await db.delete(users).where(eq(users.id, testUser2Id))
})

describe('sprintService', () => {
  describe('createSprint', () => {
    test('creates sprint with all fields and returns it', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000) // tomorrow
      const end = new Date(now.getTime() + 86400000 * 14) // 2 weeks later

      const result = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Sprint 1',
          goal: 'Deliver v1.0',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      expect(result.name).toBe('Sprint 1')
      expect(result.goal).toBe('Deliver v1.0')
      expect(result.projectId).toBe(testProjectId)
      expect(result.status).toBe('planned')
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
    })

    test('creates audit log entry with action created', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const sprint = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Audit Test Sprint',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'sprint'),
            eq(auditLogs.entityId, sprint.id),
            eq(auditLogs.action, 'created'),
            eq(auditLogs.userId, testUserId),
          ),
        )
        .limit(1)

      expect(log).toBeDefined()
      expect(log.action).toBe('created')

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, sprint.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, sprint.id))
    })

    test('throws BAD_REQUEST when startDate >= endDate', async () => {
      const now = new Date()
      const sameDate = new Date(now.getTime() + 86400000)

      await expect(
        sprintService.createSprint(
          {
            projectId: testProjectId,
            name: 'Invalid Sprint',
            startDate: sameDate.toISOString(),
            endDate: sameDate.toISOString(),
          },
          testUserId,
        ),
      ).rejects.toThrow()
    })

    test('throws when user is not a workspace member', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      await expect(
        sprintService.createSprint(
          {
            projectId: testProjectId,
            name: 'Unauthorized Sprint',
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          testUser2Id,
        ),
      ).rejects.toThrow()
    })
  })

  describe('getSprint', () => {
    test('returns sprint by id', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Get Sprint Test',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      const result = await sprintService.getSprint(created.id, testUserId)

      expect(result.id).toBe(created.id)
      expect(result.name).toBe('Get Sprint Test')
    })

    test('throws NOT_FOUND for non-existent sprint', async () => {
      await expect(
        sprintService.getSprint('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow()
    })

    test('throws when user is not a workspace member', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Unauthorized Get Test',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      await expect(sprintService.getSprint(created.id, testUser2Id)).rejects.toThrow()

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, created.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, created.id))
    })

    test('lazy status update: creates sprint with past endDate and reads it', async () => {
      const now = new Date()
      const pastStart = new Date(now.getTime() - 86400000 * 28) // 4 weeks ago
      const pastEnd = new Date(now.getTime() - 86400000 * 14) // 2 weeks ago

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Past Sprint Test',
          startDate: pastStart.toISOString(),
          endDate: pastEnd.toISOString(),
        },
        testUserId,
      )

      // The sprint was created with 'planned' status (or possibly 'active') but endDate is in the past
      // After getSprint, lazy update should change status to 'completed'
      const result = await sprintService.getSprint(created.id, testUserId)

      // Verify status was updated to 'completed' because endDate is in the past
      const [dbSprint] = await db.select().from(sprints).where(eq(sprints.id, created.id)).limit(1)
      expect(dbSprint.status).toBe('completed')
    })
  })

  describe('listByProject', () => {
    test('returns all sprints for a project ordered by startDate', async () => {
      const now = new Date()
      const start1 = new Date(now.getTime() + 86400000)
      const end1 = new Date(now.getTime() + 86400000 * 7)

      const sprint1 = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'First Sprint',
          startDate: start1.toISOString(),
          endDate: end1.toISOString(),
        },
        testUserId,
      )

      const start2 = new Date(now.getTime() + 86400000 * 8)
      const end2 = new Date(now.getTime() + 86400000 * 15)

      const sprint2 = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Second Sprint',
          startDate: start2.toISOString(),
          endDate: end2.toISOString(),
        },
        testUserId,
      )

      const result = await sprintService.listByProject(testProjectId, testUserId)

      expect(result.length).toBeGreaterThanOrEqual(2)
      const names = result.map((s) => s.name)
      expect(names).toContain('First Sprint')
      expect(names).toContain('Second Sprint')
    })

    test('throws when user is not a workspace member', async () => {
      await expect(sprintService.listByProject(testProjectId, testUser2Id)).rejects.toThrow()
    })
  })

  describe('updateSprint', () => {
    test('updates name and goal successfully', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Update Test Sprint',
          goal: 'Initial goal',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      const result = await sprintService.updateSprint(
        created.id,
        { name: 'Updated Name', goal: 'Updated goal' },
        testUserId,
      )

      expect(result.name).toBe('Updated Name')
      expect(result.goal).toBe('Updated goal')

      // Verify in DB
      const [dbSprint] = await db.select().from(sprints).where(eq(sprints.id, created.id)).limit(1)
      expect(dbSprint.name).toBe('Updated Name')
      expect(dbSprint.goal).toBe('Updated goal')

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, created.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, created.id))
    })

    test('creates per-field audit entries for changed fields only', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Audit Update Sprint',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      // Update only name
      await sprintService.updateSprint(created.id, { name: 'New Name' }, testUserId)

      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'sprint'),
            eq(auditLogs.entityId, created.id),
            eq(auditLogs.action, 'updated'),
          ),
        )

      // Should have exactly one audit entry for 'name' field
      expect(logs.length).toBe(1)
      expect(logs[0].field).toBe('name')
      expect(logs[0].oldValue).toBe('Audit Update Sprint')
      expect(logs[0].newValue).toBe('New Name')

      // Clean up
      await db.delete(auditLogs).where(eq(auditLogs.entityId, created.id))
      await db.delete(sprints).where(eq(sprints.id, created.id))
    })

    test('throws PRECONDITION_FAILED when updating a completed sprint', async () => {
      const now = new Date()
      // Create a sprint that is already completed (endDate in the past)
      const pastStart = new Date(now.getTime() - 86400000 * 28)
      const pastEnd = new Date(now.getTime() - 86400000 * 14)

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Completed Sprint',
          startDate: pastStart.toISOString(),
          endDate: pastEnd.toISOString(),
        },
        testUserId,
      )

      // Trigger lazy status update to completed
      await sprintService.getSprint(created.id, testUserId)

      // Now try to update it
      await expect(
        sprintService.updateSprint(created.id, { name: 'Should Fail' }, testUserId),
      ).rejects.toThrow()

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, created.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, created.id))
    })

    test('throws when user is not a workspace member', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const created = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Unauthorized Update',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      await expect(
        sprintService.updateSprint(created.id, { name: 'Hacked' }, testUser2Id),
      ).rejects.toThrow()

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, created.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, created.id))
    })
  })

  describe('deleteSprint', () => {
    test('deleteTasks=false: unassigns tasks (sprintId becomes null), deletes sprint, audit log created', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const sprint = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Delete Test Sprint Unassign',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      // Create tasks assigned to this sprint
      const [task1] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Task 1 for deletion',
          status: 'todo',
          sprintId: sprint.id,
          sprintFlag: null,
          storyPoints: '3',
        })
        .returning()

      const [task2] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Task 2 for deletion',
          status: 'todo',
          sprintId: sprint.id,
          sprintFlag: null,
          storyPoints: '5',
        })
        .returning()

      // Delete sprint with deleteTasks = false
      await sprintService.deleteSprint(sprint.id, testUserId, false)

      // Verify sprint is deleted
      const [deletedSprint] = await db.select().from(sprints).where(eq(sprints.id, sprint.id)).limit(1)
      expect(deletedSprint).toBeUndefined()

      // Verify tasks are unassigned (sprintId = null)
      const [updatedTask1] = await db.select().from(tasks).where(eq(tasks.id, task1.id)).limit(1)
      const [updatedTask2] = await db.select().from(tasks).where(eq(tasks.id, task2.id)).limit(1)
      expect(updatedTask1.sprintId).toBeNull()
      expect(updatedTask2.sprintId).toBeNull()

      // Verify audit log
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'sprint'),
            eq(auditLogs.entityId, sprint.id),
            eq(auditLogs.action, 'deleted'),
          ),
        )
        .limit(1)
      expect(log).toBeDefined()
      expect(log.action).toBe('deleted')

      // Clean up tasks
      await db.delete(tasks).where(eq(tasks.id, task1.id))
      await db.delete(tasks).where(eq(tasks.id, task2.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, sprint.id))
    })

    test('deleteTasks=true: hard-deletes tasks, deletes sprint, audit log created', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const sprint = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Delete Test Sprint Hard',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      // Create tasks assigned to this sprint
      const [task1] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Hard Delete Task 1',
          status: 'todo',
          sprintId: sprint.id,
          sprintFlag: null,
          storyPoints: '2',
        })
        .returning()

      const [task2] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Hard Delete Task 2',
          status: 'todo',
          sprintId: sprint.id,
          sprintFlag: null,
          storyPoints: '8',
        })
        .returning()

      const task1Id = task1.id
      const task2Id = task2.id

      // Delete sprint with deleteTasks = true
      await sprintService.deleteSprint(sprint.id, testUserId, true)

      // Verify sprint is deleted
      const [deletedSprint] = await db.select().from(sprints).where(eq(sprints.id, sprint.id)).limit(1)
      expect(deletedSprint).toBeUndefined()

      // Verify tasks are hard-deleted
      const [hardDeleted1] = await db.select().from(tasks).where(eq(tasks.id, task1Id)).limit(1)
      const [hardDeleted2] = await db.select().from(tasks).where(eq(tasks.id, task2Id)).limit(1)
      expect(hardDeleted1).toBeUndefined()
      expect(hardDeleted2).toBeUndefined()

      // Verify audit log
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'sprint'),
            eq(auditLogs.entityId, sprint.id),
            eq(auditLogs.action, 'deleted'),
          ),
        )
        .limit(1)
      expect(log).toBeDefined()
      expect(log.action).toBe('deleted')

      // Clean up audit log
      await db.delete(auditLogs).where(eq(auditLogs.entityId, sprint.id))
    })

    test('throws when user is not a workspace member', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const sprint = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Unauthorized Delete',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      await expect(
        sprintService.deleteSprint(sprint.id, testUser2Id, false),
      ).rejects.toThrow()

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, sprint.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, sprint.id))
    })
  })

  describe('computePlannedPoints', () => {
    test('sums storyPoints only for tasks with sprintFlag=null (excludes flagged tasks)', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const sprint = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Points Compute Sprint',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      // Create tasks: 3 with sprintFlag=null (should be counted), 1 with sprintFlag='unscheduled' (should NOT be counted)
      await db.insert(tasks).values({
        projectId: testProjectId,
        title: 'Counted Task 1',
        status: 'todo',
        sprintId: sprint.id,
        sprintFlag: null,
        storyPoints: '3',
      })

      await db.insert(tasks).values({
        projectId: testProjectId,
        title: 'Counted Task 2',
        status: 'todo',
        sprintId: sprint.id,
        sprintFlag: null,
        storyPoints: '5',
      })

      await db.insert(tasks).values({
        projectId: testProjectId,
        title: 'Counted Task 3',
        status: 'todo',
        sprintId: sprint.id,
        sprintFlag: null,
        storyPoints: '8',
      })

      await db.insert(tasks).values({
        projectId: testProjectId,
        title: 'Excluded Task (flagged)',
        status: 'todo',
        sprintId: sprint.id,
        sprintFlag: 'unscheduled',
        storyPoints: '13',
      })

      const points = await sprintService.computePlannedPoints(sprint.id)

      // 3 + 5 + 8 = 16, NOT 29 (13 from flagged task excluded)
      expect(points).toBe(16)
      expect(typeof points).toBe('number')

      // Clean up
      await db.delete(tasks).where(eq(tasks.sprintId, sprint.id))
      await db.delete(sprints).where(eq(sprints.id, sprint.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, sprint.id))
    })

    test('returns 0 when no tasks are assigned to sprint', async () => {
      const now = new Date()
      const start = new Date(now.getTime() + 86400000)
      const end = new Date(now.getTime() + 86400000 * 14)

      const sprint = await sprintService.createSprint(
        {
          projectId: testProjectId,
          name: 'Empty Points Sprint',
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
        testUserId,
      )

      const points = await sprintService.computePlannedPoints(sprint.id)

      expect(points).toBe(0)

      // Clean up
      await db.delete(sprints).where(eq(sprints.id, sprint.id))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, sprint.id))
    })
  })

  describe('isSprintLocked', () => {
    test('returns true for completed sprint (endDate in past)', () => {
      const now = new Date()
      const pastEnd = new Date(now.getTime() - 86400000) // yesterday
      const pastStart = new Date(now.getTime() - 86400000 * 14)

      const locked = sprintService.isSprintLocked({ startDate: pastStart, endDate: pastEnd })
      expect(locked).toBe(true)
    })

    test('returns false for active sprint (current date between start and end)', () => {
      const now = new Date()
      const pastStart = new Date(now.getTime() - 86400000 * 7) // 1 week ago
      const futureEnd = new Date(now.getTime() + 86400000 * 7) // 1 week from now

      const locked = sprintService.isSprintLocked({ startDate: pastStart, endDate: futureEnd })
      expect(locked).toBe(false)
    })

    test('returns false for planned sprint (startDate in future)', () => {
      const now = new Date()
      const futureStart = new Date(now.getTime() + 86400000 * 7) // 1 week from now
      const futureEnd = new Date(now.getTime() + 86400000 * 21) // 3 weeks from now

      const locked = sprintService.isSprintLocked({ startDate: futureStart, endDate: futureEnd })
      expect(locked).toBe(false)
    })
  })
})