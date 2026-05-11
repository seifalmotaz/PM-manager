import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { Elysia, t } from 'elysia'
import postgres from 'postgres'
import { db } from '../../db/connection'
import { users, workspaces, workspaceMembers } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { authService } from '../../modules/auth/auth.service'

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`
}

describe('Auth Guard Middleware', () => {
  // Note: This tests the auth service's getUserById which is what authGuard uses internally
  // The actual authGuard middleware integration is tested via auth.route.spec.ts

  it('getUserById returns user when valid UUID provided', async () => {
    const testEmail = uniqueEmail('guardtest')
    const [user] = await db.insert(users).values({
      email: testEmail,
      name: 'Guard Test User',
    }).returning()

    try {
      const found = await authService.getUserById(user.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(user.id)
      expect(found!.email).toBe(testEmail)
    } finally {
      // Cleanup
      await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, user.id))
      await db.delete(users).where(eq(users.id, user.id))
    }
  })

  it('getUserById returns null for non-existent UUID', async () => {
    const found = await authService.getUserById('00000000-0000-0000-0000-000000000000')
    expect(found).toBeNull()
  })

  it('getUserById throws for invalid UUID format', async () => {
    // Invalid UUID format causes PostgreSQL error - this is expected behavior
    // authGuard should validate UUID format before calling getUserById
    try {
      await authService.getUserById('not-a-valid-uuid')
      expect.unreachable('Should have thrown for invalid UUID')
    } catch (e: any) {
      // The error message from Drizzle contains "invalid input syntax for type uuid"
      expect(e.message || e.code).toMatch(/22P02|uuid/i)
    }
  })
})
