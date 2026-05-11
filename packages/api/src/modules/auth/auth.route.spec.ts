import { describe, it, expect, beforeAll, afterAll, afterEach, mock } from 'bun:test'
import { Elysia, t } from 'elysia'
import postgres from 'postgres'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { authRoutes } from './auth.route'

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}

describe('Auth Routes', () => {
  let testUserId: string
  // Track all created user IDs for cleanup
  const allCreatedUserIds: string[] = []

  beforeAll(async () => {
    // Seed a test user for session tests - use unique email
    const testEmail = uniqueEmail('routesess')
    const [user] = await db.insert(users).values({
      email: testEmail,
      name: 'Route Session User',
    }).returning()
    testUserId = user.id
    allCreatedUserIds.push(user.id)
  })

  afterEach(async () => {
    // Clean up only users created during THIS test (tests add to allCreatedUserIds)
    // The beforeAll user should persist and be cleaned in afterAll
    const usersToClean = [...allCreatedUserIds]
    allCreatedUserIds.length = 0
    
    for (const uid of usersToClean) {
      // Don't clean up testUserId here - it will be cleaned in afterAll
      if (uid === testUserId) continue
      
      try {
        await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, uid))
        const userWorkspaces = await db.select().from(workspaces).where(eq(workspaces.createdBy, uid))
        for (const ws of userWorkspaces) {
          await db.delete(workspaceMembers).where(eq(workspaceMembers.workspaceId, ws.id))
          await db.delete(workspaces).where(eq(workspaces.id, ws.id))
        }
        await db.delete(users).where(eq(users.id, uid))
      } catch (e) {
        console.error('Cleanup error for user', uid, e)
      }
    }
  })

  afterAll(async () => {
    // Clean up the beforeAll user and any remaining test users
    const allCleanup = [...allCreatedUserIds, testUserId]
    for (const uid of allCleanup) {
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

  it('GET /auth/login redirects to WorkOS', async () => {
    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          getAuthorizationUrl: (opts: any) => 
            `https://api.workos.com/user_management/authorize?client_id=${opts.clientId}&redirect_uri=${encodeURIComponent(opts.redirectUri)}&provider=${opts.provider}`,
          authenticateWithCode: () => ({}),
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const app = new Elysia().use(authRoutes)
    
    const req = new Request('http://localhost/auth/login')
    const res = await app.handle(req)
    
    expect(res.status).toBe(302)
    const location = res.headers.get('location')
    expect(location).toContain('api.workos.com')
  })

  it('GET /auth/callback with valid code returns user and sets cookie', async () => {
    const testEmail = uniqueEmail('callbacktest')
    
    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({
        userManagement: {
          getAuthorizationUrl: () => '',
          authenticateWithCode: () => ({
            user: {
              id: 'workos_test',
              email: testEmail,
              firstName: 'Callback',
              lastName: 'Test',
            },
          }),
        },
      }),
      getWorkOSClientId: () => 'test_client_id',
    }))

    const app = new Elysia().use(authRoutes)
    
    const req = new Request('http://localhost/auth/callback?code=valid_test_code')
    const res = await app.handle(req)
    
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe(testEmail)

    // Track new user for cleanup
    allCreatedUserIds.push(body.user.id)

    // Check Set-Cookie header
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeDefined()
    expect(setCookie).toContain('session=')
    expect(setCookie).toContain('HttpOnly')
  })

  it('GET /auth/callback with missing code returns 400', async () => {
    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({ userManagement: { getAuthorizationUrl: () => '' } }),
      getWorkOSClientId: () => 'test',
    }))

    const app = new Elysia().use(authRoutes)
    
    const req = new Request('http://localhost/auth/callback')
    const res = await app.handle(req)
    
    expect(res.status).toBe(400)
  })

  it('GET /auth/session returns current user when logged in', async () => {
    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({ userManagement: { getAuthorizationUrl: () => '' } }),
      getWorkOSClientId: () => 'test',
    }))

    const app = new Elysia().use(authRoutes)
    
    const req = new Request('http://localhost/auth/session', {
      headers: { Cookie: `session=${testUserId}` },
    })
    const res = await app.handle(req)
    
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user).toBeDefined()
    expect(body.user.id).toBe(testUserId)
  })

  it('POST /auth/logout clears session cookie', async () => {
    mock.module('../../shared/lib/workos', () => ({
      getWorkOS: () => ({ userManagement: { getAuthorizationUrl: () => '' } }),
      getWorkOSClientId: () => 'test',
    }))

    const app = new Elysia().use(authRoutes)
    
    const req = new Request('http://localhost/auth/logout', { method: 'POST' })
    const res = await app.handle(req)
    
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeDefined()
    // Cookie should be cleared (empty value or session=; with expires in past)
    expect(setCookie).toMatch(/session=;/)
  })
})