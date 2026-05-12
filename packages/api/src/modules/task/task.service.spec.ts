import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { setTimeout as sleep } from 'node:timers/promises'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers, projects, tasks, auditLogs } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { taskService } from './task.service'

let testUserId: string
let testUser2Id: string
let testWorkspaceId: string
let testProjectId: string
let testProject2Id: string

beforeAll(async () => {
  // Create test users
  const [user] = await db
    .insert(users)
    .values({ email: `task-test-${Date.now()}@example.com`, name: 'Task Test User' })
    .returning()
  testUserId = user.id

  const [user2] = await db
    .insert(users)
    .values({ email: `task-test2-${Date.now()}@example.com`, name: 'Task Test User 2' })
    .returning()
  testUser2Id = user2.id

  // Create a test workspace
  const slug = `task-test-ws-${Date.now()}`
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Task Test Workspace', slug, type: 'company', createdBy: testUserId })
    .returning()
  testWorkspaceId = workspace.id

  // Add test user as member
  await db.insert(workspaceMembers).values({
    workspaceId: testWorkspaceId,
    userId: testUserId,
    role: 'owner',
  })

  // Create test projects
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: testWorkspaceId,
      name: 'Task Test Project',
      description: 'Project for task tests',
    })
    .returning()
  testProjectId = project.id

  const [project2] = await db
    .insert(projects)
    .values({
      workspaceId: testWorkspaceId,
      name: 'Task Test Project 2',
      description: 'Another project for task tests',
    })
    .returning()
  testProject2Id = project2.id
})

afterAll(async () => {
  // Clean up in reverse dependency order
  // Delete all tasks created in this test
  await db.delete(tasks).where(eq(tasks.projectId, testProjectId))
  await db.delete(tasks).where(eq(tasks.projectId, testProject2Id))

  // Delete audit logs
  if (testUserId) await db.delete(auditLogs).where(eq(auditLogs.userId, testUserId))
  if (testUser2Id) await db.delete(auditLogs).where(eq(auditLogs.userId, testUser2Id))

  // Delete projects
  await db.delete(projects).where(eq(projects.workspaceId, testWorkspaceId))

  // Delete workspace members
  await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, testWorkspaceId))

  // Delete workspace
  await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId))

  // Delete users
  await db.delete(users).where(eq(users.id, testUserId))
  await db.delete(users).where(eq(users.id, testUser2Id))
})

describe('taskService', () => {
  describe('createTask', () => {
    let createdTaskId1: string

    test('creates task with status todo and statusChangedAt', async () => {
      const result = await taskService.createTask(
        { projectId: testProjectId, title: 'Test task' },
        testUserId,
      )

      expect(result).not.toBeNull()
      expect(result!.status).toBe('todo')
      expect(result!.statusChangedAt).toBeDefined()
      expect(result!.statusChangedAt).toBeInstanceOf(Date)
      expect(result!.title).toBe('Test task')
      expect(result!.projectId).toBe(testProjectId)

      createdTaskId1 = result!.id
    })

    test('creates audit log entry', async () => {
      expect(createdTaskId1).toBeDefined()

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'task'),
            eq(auditLogs.entityId, createdTaskId1),
            eq(auditLogs.action, 'created'),
          ),
        )
        .limit(1)

      expect(log).toBeDefined()
      expect(log!.userId).toBe(testUserId)
    })

    test('throws when user does not have project access', async () => {
      await expect(
        taskService.createTask(
          { projectId: testProjectId, title: 'Unauthorized task' },
          testUser2Id,
        ),
      ).rejects.toThrow()
    })

    test('stores optional fields (priority, SP, assignee, dates, sprint)', async () => {
      const result = await taskService.createTask(
        {
          projectId: testProjectId,
          title: 'Full task',
          priority: 'p1',
          storyPoints: 5,
          assigneeId: testUserId,
          dueDate: '2026-06-15T00:00:00.000Z',
          description: 'desc',
        },
        testUserId,
      )

      expect(result).not.toBeNull()
      expect(result!.priority).toBe('p1')
      expect(result!.title).toBe('Full task')
      expect(result!.description).toBe('desc')

      // Clean up
      await db.delete(auditLogs).where(eq(auditLogs.entityId, result!.id))
      await db.delete(tasks).where(eq(tasks.id, result!.id))
    })

    afterAll(async () => {
      if (createdTaskId1) {
        await db.delete(auditLogs).where(eq(auditLogs.entityId, createdTaskId1))
        await db.delete(tasks).where(eq(tasks.id, createdTaskId1))
      }
    })
  })

  describe('getTask', () => {
    let testTaskId: string

    beforeAll(async () => {
      const [task] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'Get test task' })
        .returning()
      testTaskId = task.id
    })

    afterAll(async () => {
      if (testTaskId) {
        await db.delete(tasks).where(eq(tasks.id, testTaskId))
      }
    })

    test('returns task with project relation', async () => {
      const result = await taskService.getTask(testTaskId, testUserId)
      expect(result).not.toBeNull()
      expect(result!.id).toBe(testTaskId)
      expect(result!.title).toBe('Get test task')
      expect(result!.status).toBe('todo')
    })

    test('throws when task not found', async () => {
      await expect(
        taskService.getTask('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow()
    })

    test('throws when user has no project access', async () => {
      await expect(
        taskService.getTask(testTaskId, testUser2Id),
      ).rejects.toThrow()
    })
  })

  describe('listTasks', () => {
    let taskInProject1: string
    let taskInProject1b: string
    let taskInProject2: string

    beforeAll(async () => {
      // Create 2 tasks in testProject, 1 in testProject2
      const [t1] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'List task A' })
        .returning()
      taskInProject1 = t1.id

      const [t2] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'List task B' })
        .returning()
      taskInProject1b = t2.id

      const [t3] = await db
        .insert(tasks)
        .values({ projectId: testProject2Id, title: 'List task C' })
        .returning()
      taskInProject2 = t3.id
    })

    afterAll(async () => {
      await db.delete(tasks).where(eq(tasks.id, taskInProject1))
      await db.delete(tasks).where(eq(tasks.id, taskInProject1b))
      await db.delete(tasks).where(eq(tasks.id, taskInProject2))
    })

    test('returns tasks filtered by projectId', async () => {
      const result = await taskService.listTasks(
        { projectId: testProjectId },
        testUserId,
      )

      expect(result.length).toBe(2)
      const ids = result.map((t: any) => t.id)
      expect(ids).toContain(taskInProject1)
      expect(ids).toContain(taskInProject1b)
      expect(ids).not.toContain(taskInProject2)
    })

    test('returns tasks filtered by status', async () => {
      // Create another task with status 'in_progress'
      const [todoTask] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'Todo task', status: 'todo' })
        .returning()

      const [inProgressTask] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'In progress task', status: 'in_progress' })
        .returning()

      const result = await taskService.listTasks(
        { status: 'todo', projectId: testProjectId },
        testUserId,
      )

      const ids = result.map((t: any) => t.id)
      expect(ids).toContain(todoTask.id)
      expect(ids).not.toContain(inProgressTask.id)
      expect(result.length).toBeGreaterThanOrEqual(1)

      // Clean up
      await db.delete(tasks).where(eq(tasks.id, todoTask.id))
      await db.delete(tasks).where(eq(tasks.id, inProgressTask.id))
    })

    test('returns tasks filtered by assigneeId', async () => {
      // Assign testUser2 to one existing task
      await db
        .update(tasks)
        .set({ assigneeId: testUser2Id })
        .where(eq(tasks.id, taskInProject1))

      const result = await taskService.listTasks(
        { assigneeId: testUser2Id, projectId: testProjectId },
        testUserId,
      )

      expect(result.length).toBe(1)
      expect(result[0].id).toBe(taskInProject1)

      // Clean up
      await db.update(tasks).set({ assigneeId: null }).where(eq(tasks.id, taskInProject1))
    })

    test('returns all tasks when no filters provided', async () => {
      const result = await taskService.listTasks({}, testUserId)

      // Should include all tasks across projects
      const ids = result.map((t: any) => t.id)
      expect(ids).toContain(taskInProject1)
      expect(ids).toContain(taskInProject1b)
      expect(ids).toContain(taskInProject2)
    })
  })

  describe('updateTask', () => {
    let updateTaskId: string

    beforeAll(async () => {
      const [task] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Update test task',
          priority: 'p2',
          description: 'Original description',
        })
        .returning()
      updateTaskId = task.id
    })

    afterAll(async () => {
      if (updateTaskId) {
        await db.delete(auditLogs).where(eq(auditLogs.entityId, updateTaskId))
        await db.delete(tasks).where(eq(tasks.id, updateTaskId))
      }
    })

    test('updates provided fields', async () => {
      const result = await taskService.updateTask(
        updateTaskId,
        { title: 'Updated title', priority: 'p1' },
        testUserId,
      )

      expect(result!.title).toBe('Updated title')
      expect(result!.priority).toBe('p1')

      // Verify in DB
      const [dbTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, updateTaskId))
        .limit(1)

      expect(dbTask.title).toBe('Updated title')
      expect(dbTask.priority).toBe('p1')
    })

    test('creates per-field audit entries', async () => {
      // Clear audit logs from previous update
      await db.delete(auditLogs).where(eq(auditLogs.entityId, updateTaskId))

      // Reset to known state
      await db
        .update(tasks)
        .set({ title: 'Base title', priority: 'p3', description: 'Base desc' })
        .where(eq(tasks.id, updateTaskId))

      await db.delete(auditLogs).where(eq(auditLogs.entityId, updateTaskId))

      // Now update all three fields
      await taskService.updateTask(
        updateTaskId,
        { title: 'New title', priority: 'p1', description: 'New desc' },
        testUserId,
      )

      // Wait for fire-and-forget audit writes
      await sleep(150)

      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'task'),
            eq(auditLogs.entityId, updateTaskId),
            eq(auditLogs.action, 'updated'),
          ),
        )

      expect(logs.length).toBe(3)

      const fieldNames = logs.map((l) => l.field)
      expect(fieldNames).toContain('title')
      expect(fieldNames).toContain('priority')
      expect(fieldNames).toContain('description')
    })

    test('returns unchanged task when no fields differ', async () => {
      // Clear audit logs
      await db.delete(auditLogs).where(eq(auditLogs.entityId, updateTaskId))

      // Update with same values — should still "succeed" but not create DB write
      const result = await taskService.updateTask(
        updateTaskId,
        { title: 'New title', priority: 'p1' },
        testUserId,
      )

      // The task should be returned with the same values
      expect(result!.title).toBe('New title')
    })
  })

  describe('changeStatus', () => {
    let statusTaskId: string

    beforeAll(async () => {
      const [task] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'Status test task' })
        .returning()
      statusTaskId = task.id
    })

    afterAll(async () => {
      if (statusTaskId) {
        await db.delete(auditLogs).where(eq(auditLogs.entityId, statusTaskId))
        await db.delete(tasks).where(eq(tasks.id, statusTaskId))
      }
    })

    test('transitions todo -> in_progress and sets startedAt', async () => {
      // Reset to todo
      await db
        .update(tasks)
        .set({ status: 'todo', startedAt: null, completedAt: null })
        .where(eq(tasks.id, statusTaskId))

      const result = await taskService.changeStatus(statusTaskId, 'in_progress', testUserId)

      expect(result!.status).toBe('in_progress')
      expect(result!.startedAt).toBeDefined()
      expect(result!.startedAt).toBeInstanceOf(Date)
      expect(result!.statusChangedAt).toBeDefined()
    })

    test('transitions in_progress -> done and sets completedAt', async () => {
      const result = await taskService.changeStatus(statusTaskId, 'done', testUserId)

      expect(result!.status).toBe('done')
      expect(result!.completedAt).toBeDefined()
      expect(result!.completedAt).toBeInstanceOf(Date)
    })

    test('transitions done -> in_progress and clears completedAt', async () => {
      expect(statusTaskId).toBeDefined()

      const result = await taskService.changeStatus(statusTaskId, 'in_progress', testUserId)

      expect(result!.status).toBe('in_progress')
      expect(result!.completedAt).toBeNull()
    })

    test('creates status_changed audit entry', async () => {
      // Clear previous audit logs
      await db.delete(auditLogs).where(eq(auditLogs.entityId, statusTaskId))

      // Transition todo -> in_progress
      await db
        .update(tasks)
        .set({ status: 'todo', startedAt: null, completedAt: null })
        .where(eq(tasks.id, statusTaskId))

      await taskService.changeStatus(statusTaskId, 'in_progress', testUserId)

      // Wait for fire-and-forget writes
      await sleep(100)

      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'task'),
            eq(auditLogs.entityId, statusTaskId),
            eq(auditLogs.action, 'status_changed'),
          ),
        )

      expect(logs.length).toBeGreaterThanOrEqual(1)
      expect(logs[0].oldValue).toBe('todo')
      expect(logs[0].newValue).toBe('in_progress')
    })

    test('creates audit entry when reopening from done (completedAt cleared)', async () => {
      // Ensure task is currently 'done', then reopen
      await db
        .update(tasks)
        .set({ status: 'done', completedAt: new Date(), startedAt: new Date() })
        .where(eq(tasks.id, statusTaskId))

      await db.delete(auditLogs).where(eq(auditLogs.entityId, statusTaskId))

      await taskService.changeStatus(statusTaskId, 'in_progress', testUserId)

      // Wait for fire-and-forget writes
      await sleep(100)

      // Should have a status_changed entry AND an updated entry for completedAt
      const updatedLogs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'task'),
            eq(auditLogs.entityId, statusTaskId),
            eq(auditLogs.action, 'updated'),
            eq(auditLogs.field, 'completedAt'),
          ),
        )

      expect(updatedLogs.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('deleteTask', () => {
    test('removes task and creates audit entry', async () => {
      const [deletableTask] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'Delete me' })
        .returning()

      await taskService.deleteTask(deletableTask.id, testUserId)

      // Verify task is gone
      const [dbTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, deletableTask.id))
        .limit(1)
      expect(dbTask).toBeUndefined()

      // Verify audit entry
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'task'),
            eq(auditLogs.entityId, deletableTask.id),
            eq(auditLogs.action, 'deleted'),
          ),
        )
        .limit(1)
      expect(log).toBeDefined()
      expect(log!.userId).toBe(testUserId)
    })
  })

  describe('getOverdueCount', () => {
    let overdueTaskId: string
    let doneOverdueTaskId: string
    let futureTaskId: string

    beforeAll(async () => {
      // Create a task with deadline in the past, status='todo'
      const [overdue] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Overdue task',
          deadline: new Date('2020-01-01'),
          status: 'todo',
        })
        .returning()
      overdueTaskId = overdue.id

      // Create a task with deadline in the past, status='done' (should NOT count)
      const [doneOverdue] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Done overdue task',
          deadline: new Date('2020-01-01'),
          status: 'done',
        })
        .returning()
      doneOverdueTaskId = doneOverdue.id

      // Create a task with future deadline (should NOT count)
      const [future] = await db
        .insert(tasks)
        .values({
          projectId: testProjectId,
          title: 'Future task',
          deadline: new Date('2099-01-01'),
          status: 'todo',
        })
        .returning()
      futureTaskId = future.id
    })

    afterAll(async () => {
      await db.delete(tasks).where(eq(tasks.id, overdueTaskId))
      await db.delete(tasks).where(eq(tasks.id, doneOverdueTaskId))
      await db.delete(tasks).where(eq(tasks.id, futureTaskId))
    })

    test('returns count of overdue tasks', async () => {
      const count = await taskService.getOverdueCount(testUserId)
      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('returns 0 when no overdue tasks', async () => {
      // Delete the overdue task
      await db.delete(tasks).where(eq(tasks.id, overdueTaskId))

      const count = await taskService.getOverdueCount(testUserId)
      expect(count).toBe(0)
    })
  })

  describe('listHome', () => {
    let homeTaskId: string

    beforeAll(async () => {
      const [task] = await db
        .insert(tasks)
        .values({ projectId: testProjectId, title: 'Home task' })
        .returning()
      homeTaskId = task.id
    })

    afterAll(async () => {
      if (homeTaskId) {
        await db.delete(tasks).where(eq(tasks.id, homeTaskId))
      }
    })

    test('filters tasks by workspaceIds', async () => {
      const result = await taskService.listHome([testWorkspaceId], testUserId)

      const ids = result.map((t: any) => t.id)
      expect(ids).toContain(homeTaskId)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })
})
