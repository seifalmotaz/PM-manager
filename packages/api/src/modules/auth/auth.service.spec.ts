import { describe, it, expect, beforeAll, afterAll, afterEach, mock } from 'bun:test'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers } from '../../db/schema'
import { eq } from 'drizzle-orm'

// Use unique emails per test to avoid collision issues
function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}

describe('Auth Service', () => {
  // Track IDs to clean up after each test
  const createdUserIds: string[] = []

  afterEach(async () => {
    // Clean up in correct order:
    // 1. Delete workspace_members first (join table)
    // 2. Delete workspaces (has FK to users via createdBy)
    // 3. Delete users (has no FK dependencies in this context)
    for (const uid of createdUserIds) {
      try {
        // Delete memberships for this user
        await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, uid))
        // Find and delete workspaces created by this user
        const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.createdBy, uid))
        for (const ws of userWorkspaces) {
          await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id))
          await db.delete(workspaces).where(eq(workspaces.id, ws.id))
        }
        // Finally delete the user
        await db.delete(users).where(eq(users.id, uid))
      } catch (e) {
        console.error('Cleanup error for user', uid, e)
      }
    }
    createdUserIds.length = 0
  })

  afterAll(async () => {
    // Final cleanup
    for (const uid of createdUserIds) {
      try {
        await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, uid))
        const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.createdBy, uid))
        for (const ws of userWorkspaces) {
          await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id))
          await db.delete(workspaces).where(eq(workspaces.id, ws.id))
        }
        await db.delete(users).where(eq(users.id, uid))
      } catch (e) {
        console.error('Final cleanup error for user', uid, e)
      }
    }
  })

  it('getAuthorizationUrl returns correct WorkOS URL', async () => {
    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          getAuthorizationUrl: (opts: any) => {
            return `https://api.workos.com/user_management/authorize?client_id=${opts.clientId}&redirect_uri=${encodeURIComponent(opts.redirectUri)}&provider=${opts.provider}`
          },
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const { authService } = await import('./auth.service')
    const url = authService.getAuthorizationUrl('http://localhost:5173/auth/callback')
    expect(url).toContain('https://api.workos.com/user_management/authorize')
    expect(url).toContain('test_client_id')
    expect(url).toContain('authkit')
    // URL is encoded, so callback becomes auth%2Fcallback
    expect(url).toContain('auth%2Fcallback')
  })

  it('authenticateWithCode creates new user for unknown email', async () => {
    const testEmail = uniqueEmail('brandnew')

    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          authenticateWithCode: () => ({
            user: {
              id: 'workos_new_001',
              email: testEmail,
              firstName: 'Brand',
              lastName: 'New',
            },
          }),
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const { authService } = await import('./auth.service')
    const result = await authService.authenticateWithCode('valid_code')

    expect(result.user.email).toBe(testEmail)
    expect(result.user.name).toBe('Brand New')
    expect(result.user.id).toBeDefined()

    // Track for cleanup
    createdUserIds.push(result.user.id)

    // Verify user was persisted in DB
    const [dbUser] = await db.select().from(users).where(eq(users.email, testEmail))
    expect(dbUser).toBeDefined()
    expect(dbUser!.name).toBe('Brand New')
  })

  it('authenticateWithCode returns existing user for known email', async () => {
    const testEmail = uniqueEmail('existing')

    // Seed an existing user first
    const [existingUser] = await db.insert(users).values({
      email: testEmail,
      name: 'Existing User',
    }).returning()

    // Track for cleanup
    createdUserIds.push(existingUser.id)

    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          authenticateWithCode: () => ({
            user: {
              id: 'workos_existing',
              email: testEmail,
              firstName: 'Existing',
              lastName: 'User',
            },
          }),
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const { authService } = await import('./auth.service')
    const result = await authService.authenticateWithCode('valid_code')

    // Should return the existing user, not create a duplicate
    expect(result.user.id).toBe(existingUser.id)
    expect(result.user.email).toBe(testEmail)

    // Count users with this email — should be exactly 1
    const allUsers = await db.select().from(users).where(eq(users.email, testEmail))
    expect(allUsers.length).toBe(1)
  })

  it('first login auto-creates personal workspace', async () => {
    const testEmail = uniqueEmail('firsttimer')

    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          authenticateWithCode: () => ({
            user: {
              id: 'workos_first_001',
              email: testEmail,
              firstName: 'First',
              lastName: 'Timer',
            },
          }),
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const { authService } = await import('./auth.service')
    const result = await authService.authenticateWithCode('valid_code')

    // Track for cleanup
    createdUserIds.push(result.user.id)

    // Verify personal workspace was created
    const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.createdBy, result.user.id))
    expect(userWorkspaces.length).toBe(1)
    expect(userWorkspaces[0].name).toBe('Personal')
    expect(userWorkspaces[0].type).toBe('personal')

    // Verify user was added as a member
    const memberships = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, result.user.id))
    expect(memberships.length).toBe(1)
    expect(memberships[0].role).toBe('admin')
  })

  it('second login does not create duplicate personal workspace', async () => {
    const testEmail = uniqueEmail('returning')

    // Seed an existing user who already logged in before (has workspace)
    const [existingUser] = await db.insert(users).values({
      email: testEmail,
      name: 'Returning User',
    }).returning()

    // Track for cleanup
    createdUserIds.push(existingUser.id)

    // Give them a personal workspace
    await db.insert(workspaces).values({
      name: 'Personal',
      slug: `personal-${existingUser.id}`,
      type: 'personal',
      createdBy: existingUser.id,
    }).returning()

    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          authenticateWithCode: () => ({
            user: {
              id: 'workos_returning',
              email: testEmail,
              firstName: 'Returning',
              lastName: 'User',
            },
          }),
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const { authService } = await import('./auth.service')
    await authService.authenticateWithCode('valid_code')

    // Count workspaces — should still be exactly 1
    const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.createdBy, existingUser.id))
    expect(userWorkspaces.length).toBe(1)
  })

  it('getUserById returns user when found', async () => {
    const testEmail = uniqueEmail('lookup')

    const [user] = await db.insert(users).values({
      email: testEmail,
      name: 'Lookup User',
    }).returning()

    // Track for cleanup
    createdUserIds.push(user.id)

    const { authService } = await import('./auth.service')
    const found = await authService.getUserById(user.id)
    expect(found).toBeDefined()
    expect(found!.email).toBe(testEmail)
  })

  it('getUserById returns null when not found', async () => {
    const { authService } = await import('./auth.service')
    const found = await authService.getUserById('00000000-0000-0000-0000-000000000000')
    expect(found).toBeNull()
  })
})