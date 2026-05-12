import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers, projects, auditLogs } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { projectService } from './project.service'

let testUserId: string
let testUserEmail: string
let testUser2Id: string
let testWorkspaceId: string
let testProjectId: string
let testProject2Id: string

beforeAll(async () => {
  // Create test users
  testUserEmail = `test-proj-${Date.now()}@example.com`
  const [user] = await db
    .insert(users)
    .values({ email: testUserEmail, name: 'Test User' })
    .returning()
  testUserId = user.id

  const [user2] = await db
    .insert(users)
    .values({ email: `test-proj2-${Date.now()}@example.com`, name: 'Test User 2' })
    .returning()
  testUser2Id = user2.id

  // Create a test workspace
  const slug = `test-proj-ws-${Date.now()}`
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: 'Project Test Workspace', slug, type: 'company', createdBy: testUserId })
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
      name: 'Alpha Project',
      description: 'First project',
      color: '#0000ff',
    })
    .returning()
  testProjectId = project.id

  // Create a second test project for ordering / deletion audit tests
  const [project2] = await db
    .insert(projects)
    .values({
      workspaceId: testWorkspaceId,
      name: 'Beta Project',
      description: 'Second project',
      color: '#00ff00',
    })
    .returning()
  testProject2Id = project2.id
})

afterAll(async () => {
  // Delete in reverse dependency order
  // Clear audit logs for test users
  await db.delete(auditLogs).where(eq(auditLogs.userId, testUserId))
  if (testUser2Id) {
    await db.delete(auditLogs).where(eq(auditLogs.userId, testUser2Id))
  }

  // Delete projects
  await db.delete(projects).where(eq(projects.workspaceId, testWorkspaceId))

  // Delete workspace members
  await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, testWorkspaceId))

  // Delete workspace
  await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId))

  // Delete users
  await db.delete(users).where(eq(users.id, testUserId))
  if (testUser2Id) {
    await db.delete(users).where(eq(users.id, testUser2Id))
  }
})

describe('projectService', () => {
  describe('listProjects', () => {
    test('returns projects for a workspace when user is a member', async () => {
      const result = await projectService.listProjects(testWorkspaceId, testUserId)

      expect(result.length).toBeGreaterThanOrEqual(2)

      const alpha = result.find((p) => p.name === 'Alpha Project')
      expect(alpha).toBeDefined()
      expect(alpha!.workspaceId).toBe(testWorkspaceId)

      const beta = result.find((p) => p.name === 'Beta Project')
      expect(beta).toBeDefined()

      // Verify projects are ordered by name (ascending)
      const names = result.map((p) => p.name)
      expect(names).toEqual([...names].sort())
    })

    test('with no workspaceId returns all accessible projects', async () => {
      const result = await projectService.listProjects(undefined, testUserId)
      expect(result.length).toBeGreaterThanOrEqual(2)
    })

    test('throws when user is not a workspace member', async () => {
      await expect(
        projectService.listProjects(testWorkspaceId, testUser2Id),
      ).rejects.toThrow()
    })
  })

  describe('getProject', () => {
    test('returns project when user has workspace access', async () => {
      const result = await projectService.getProject(testProjectId, testUserId)
      expect(result.name).toBe('Alpha Project')
      expect(result.workspaceId).toBe(testWorkspaceId)
    })

    test('throws when project not found', async () => {
      await expect(
        projectService.getProject('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow()
    })

    test('throws when user is not a workspace member', async () => {
      await expect(
        projectService.getProject(testProjectId, testUser2Id),
      ).rejects.toThrow()
    })
  })

  describe('createProject', () => {
    let createdProjectId: string

    test('creates project and returns it with all fields', async () => {
      const result = await projectService.createProject(
        {
          workspaceId: testWorkspaceId,
          name: 'New Project',
          description: 'A test',
          color: '#ff0000',
        },
        testUserId,
      )

      expect(result.name).toBe('New Project')
      expect(result.description).toBe('A test')
      expect(result.color).toBe('#ff0000')
      expect(result.workspaceId).toBe(testWorkspaceId)
      expect(result.isInbox).toBe(false)
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()

      createdProjectId = result.id

      // Verify in DB
      const [dbProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, createdProjectId))
        .limit(1)
      expect(dbProject).toBeDefined()
      expect(dbProject.name).toBe('New Project')
    })

    test('creates audit log entry', async () => {
      expect(createdProjectId).toBeDefined()

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'project'),
            eq(auditLogs.entityId, createdProjectId),
            eq(auditLogs.action, 'created'),
            eq(auditLogs.userId, testUserId),
          ),
        )
        .limit(1)
      expect(log).toBeDefined()
      expect(log.action).toBe('created')
    })

    test('throws when user is not a workspace member', async () => {
      await expect(
        projectService.createProject(
          { workspaceId: testWorkspaceId, name: 'Unauthorized' },
          testUser2Id,
        ),
      ).rejects.toThrow()
    })

    afterAll(async () => {
      if (createdProjectId) {
        await db.delete(projects).where(eq(projects.id, createdProjectId))
        await db.delete(auditLogs).where(eq(auditLogs.entityId, createdProjectId))
      }
    })
  })

  describe('updateProject', () => {
    test('updates allowed fields (name, description, color)', async () => {
      const updated = await projectService.updateProject(
        testProjectId,
        { name: 'Updated Name', description: 'Updated desc', color: '#00ff00' },
        testUserId,
      )

      expect(updated.name).toBe('Updated Name')
      expect(updated.description).toBe('Updated desc')
      expect(updated.color).toBe('#00ff00')

      // Verify in DB
      const [dbProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProjectId))
        .limit(1)
      expect(dbProject.name).toBe('Updated Name')
      expect(dbProject.description).toBe('Updated desc')
      expect(dbProject.color).toBe('#00ff00')

      // Verify updatedAt changed
      expect(dbProject.updatedAt.getTime()).toBeGreaterThan(
        dbProject.createdAt.getTime(),
      )
    })

    test('creates per-field audit entries for changed fields only', async () => {
      // Restore original values first
      await db
        .update(projects)
        .set({ name: 'Alpha Project', description: 'First project', color: '#0000ff' })
        .where(eq(projects.id, testProjectId))

      // Clear audit logs from the restore
      await db.delete(auditLogs).where(eq(auditLogs.entityId, testProjectId))

      // Now update all three fields
      await projectService.updateProject(
        testProjectId,
        { name: 'Updated Again', description: 'Brand new desc', color: '#ff0000' },
        testUserId,
      )

      // Query audit entries for this project
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'project'),
            eq(auditLogs.entityId, testProjectId),
            eq(auditLogs.action, 'updated'),
          ),
        )

      expect(logs.length).toBe(3)

      // Verify each field has an entry
      const fieldNames = logs.map((l) => l.field)
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('description')
      expect(fieldNames).toContain('color')

      // Verify old/new values
      const nameLog = logs.find((l) => l.field === 'name')
      expect(nameLog!.oldValue).toBe('Alpha Project')
      expect(nameLog!.newValue).toBe('Updated Again')

      const descLog = logs.find((l) => l.field === 'description')
      expect(descLog!.oldValue).toBe('First project')
      expect(descLog!.newValue).toBe('Brand new desc')

      const colorLog = logs.find((l) => l.field === 'color')
      expect(colorLog!.oldValue).toBe('#0000ff')
      expect(colorLog!.newValue).toBe('#ff0000')
    })

    test('does NOT create audit entries for unchanged fields', async () => {
      // Clear audit logs from previous test
      await db.delete(auditLogs).where(eq(auditLogs.entityId, testProjectId))

      // Only update name, leave description and color as-is
      // Reset to known state first
      await db
        .update(projects)
        .set({ name: 'Base Name', description: 'Base desc', color: '#ffffff' })
        .where(eq(projects.id, testProjectId))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, testProjectId))

      await projectService.updateProject(
        testProjectId,
        { name: 'New Name' },
        testUserId,
      )

      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'project'),
            eq(auditLogs.entityId, testProjectId),
            eq(auditLogs.action, 'updated'),
          ),
        )

      expect(logs.length).toBe(1)
      expect(logs[0].field).toBe('name')
    })

    test('throws when user is not a workspace member', async () => {
      await expect(
        projectService.updateProject(
          testProjectId,
          { name: 'Should Not Work' },
          testUser2Id,
        ),
      ).rejects.toThrow()
    })

    test('throws when project does not exist', async () => {
      await expect(
        projectService.updateProject(
          '00000000-0000-0000-0000-000000000000',
          { name: 'Ghost' },
          testUserId,
        ),
      ).rejects.toThrow()
    })
  })

  describe('deleteProject', () => {
    test('removes project', async () => {
      // Use testProject2Id for deletion test
      await projectService.deleteProject(testProject2Id, testUserId)

      const [dbProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, testProject2Id))
        .limit(1)
      expect(dbProject).toBeUndefined()
    })

    test('creates audit log with action deleted', async () => {
      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'project'),
            eq(auditLogs.entityId, testProject2Id),
            eq(auditLogs.action, 'deleted'),
          ),
        )
        .limit(1)
      expect(log).toBeDefined()
      expect(log.action).toBe('deleted')
      expect(log.userId).toBe(testUserId)
    })

    test('throws when user is not a workspace member', async () => {
      // Create a temporary project for this test
      const [tempProject] = await db
        .insert(projects)
        .values({ workspaceId: testWorkspaceId, name: 'Temp Delete Test' })
        .returning()

      await expect(
        projectService.deleteProject(tempProject.id, testUser2Id),
      ).rejects.toThrow()

      // Clean up temp project
      await db.delete(projects).where(eq(projects.id, tempProject.id))
    })
  })
})
