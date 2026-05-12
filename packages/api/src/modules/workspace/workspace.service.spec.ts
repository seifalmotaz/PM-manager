import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers, auditLogs } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { workspaceService } from './workspace.service'

let testUserId: string
let testUserEmail: string
let testUser2Id: string
let testUser3Id: string
let testWorkspaceId: string
let testWorkspaceName: string

beforeAll(async () => {
  // Create test users
  testUserEmail = `test-${Date.now()}@example.com`
  const [user] = await db
    .insert(users)
    .values({ email: testUserEmail, name: 'Test User' })
    .returning()
  testUserId = user.id

  const [user2] = await db
    .insert(users)
    .values({ email: `test2-${Date.now()}@example.com`, name: 'Test User 2' })
    .returning()
  testUser2Id = user2.id

  const [user3] = await db
    .insert(users)
    .values({ email: `test3-${Date.now()}@example.com`, name: 'Test User 3' })
    .returning()
  testUser3Id = user3.id

  // Create a test workspace
  testWorkspaceName = 'Test Workspace'
  const slug = `test-workspace-${Date.now()}`
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: testWorkspaceName, slug, type: 'company', createdBy: testUserId })
    .returning()
  testWorkspaceId = workspace.id

  // Add test user as member
  await db.insert(workspaceMembers).values({
    workspaceId: testWorkspaceId,
    userId: testUserId,
    role: 'owner',
  })
})

afterAll(async () => {
  // Delete in reverse dependency order (audit logs -> members -> workspaces -> users)
  await db.delete(auditLogs).where(eq(auditLogs.userId, testUserId))
  if (testUser2Id) {
    await db.delete(auditLogs).where(eq(auditLogs.userId, testUser2Id))
  }
  if (testUser3Id) {
    await db.delete(auditLogs).where(eq(auditLogs.userId, testUser3Id))
  }

  await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, testUserId))
  if (testUser2Id) {
    await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, testUser2Id))
  }
  if (testUser3Id) {
    await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, testUser3Id))
  }
  await db.delete(workspaces).where(eq(workspaces.id, testWorkspaceId))
  await db.delete(users).where(eq(users.id, testUserId))
  if (testUser2Id) {
    await db.delete(users).where(eq(users.id, testUser2Id))
  }
  if (testUser3Id) {
    await db.delete(users).where(eq(users.id, testUser3Id))
  }
})

describe('workspaceService', () => {
  describe('listUserWorkspaces', () => {
    test('returns workspaces the user is a member of', async () => {
      const result = await workspaceService.listUserWorkspaces(testUserId)
      expect(result.length).toBeGreaterThanOrEqual(1)
      for (const ws of result) {
        expect(ws).toHaveProperty('id')
        expect(ws).toHaveProperty('name')
        expect(ws).toHaveProperty('slug')
        expect(ws).toHaveProperty('type')
        expect(ws).toHaveProperty('memberCount')
      }
    })

    test('returns empty array for user with no memberships', async () => {
      const result = await workspaceService.listUserWorkspaces(testUser2Id)
      expect(result).toEqual([])
    })

    test('returns memberCount per workspace', async () => {
      const result = await workspaceService.listUserWorkspaces(testUserId)
      for (const ws of result) {
        if (ws.id === testWorkspaceId) {
          expect(ws.memberCount).toBe(1)
        }
      }
    })
  })

  describe('getWorkspace', () => {
    test('returns workspace when user is a member', async () => {
      const ws = await workspaceService.getWorkspace(testWorkspaceId, testUserId)
      expect(ws.name).toBe(testWorkspaceName)
      expect(ws.slug).toMatch(/^test-workspace-\d+$/)
    })

    test('throws when user is not a member', async () => {
      await expect(
        workspaceService.getWorkspace(testWorkspaceId, testUser3Id),
      ).rejects.toThrow()
    })

    test('throws when workspace does not exist', async () => {
      await expect(
        workspaceService.getWorkspace('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow()
    })
  })

  describe('createCompanyWorkspace', () => {
    let createdWorkspaceId: string

    test('creates workspace and adds creator as owner member', async () => {
      const ws = await workspaceService.createCompanyWorkspace('Test Company', testUserId)
      expect(ws.name).toBe('Test Company')
      expect(ws.type).toBe('company')
      expect(ws.slug).toMatch(/^test-company-\d+$/)
      createdWorkspaceId = ws.id

      // Verify creator is a member with role 'owner'
      const [member] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, ws.id),
            eq(workspaceMembers.userId, testUserId),
          ),
        )
        .limit(1)
      expect(member).toBeDefined()
      expect(member.role).toBe('owner')
    })

    test('creates an audit log entry', async () => {
      expect(createdWorkspaceId).toBeDefined()

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, 'workspace'),
            eq(auditLogs.entityId, createdWorkspaceId),
            eq(auditLogs.userId, testUserId),
          ),
        )
        .limit(1)
      expect(log).toBeDefined()
      expect(log.action).toBe('created')
    })

    afterAll(async () => {
      if (createdWorkspaceId) {
        await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, createdWorkspaceId))
        await db.delete(workspaces).where(eq(workspaces.id, createdWorkspaceId))
      }
    })
  })

  describe('listMembers', () => {
    test('returns members for a workspace', async () => {
      const members = await workspaceService.listMembers(testWorkspaceId, testUserId)
      expect(members.length).toBeGreaterThanOrEqual(1)
      for (const m of members) {
        expect(m).toHaveProperty('user')
        expect(m.user).toHaveProperty('id')
        expect(m.user).toHaveProperty('name')
        expect(m.user).toHaveProperty('email')
      }
    })

    test('throws when user is not a workspace member', async () => {
      await expect(
        workspaceService.listMembers(testWorkspaceId, testUser3Id),
      ).rejects.toThrow()
    })
  })
})
