import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { createContext } from './trpc'
import { db } from './db/connection'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

let testUserId: string
const testUserEmail = 'context-test@example.com'

beforeAll(async () => {
  const [user] = await db.insert(users).values({
    email: testUserEmail,
    name: 'Context Test User',
  }).returning()
  testUserId = user.id
})

afterAll(async () => {
  await db.delete(users).where(eq(users.id, testUserId))
})

describe('createContext', () => {
  test('returns null user when no session cookie', async () => {
    const req = new Request('http://localhost:3000/trpc/auth.session')
    const resHeaders = new Headers()
    const ctx = await createContext({ req, resHeaders })
    expect(ctx.user).toBeNull()
  })

  test('returns null user with invalid session token', async () => {
    const req = new Request('http://localhost:3000/trpc/auth.session', {
      headers: { Cookie: 'session=00000000-0000-0000-0000-000000000000' }
    })
    const resHeaders = new Headers()
    const ctx = await createContext({ req, resHeaders })
    expect(ctx.user).toBeNull()
  })

  test('returns null user with malformed Cookie header', async () => {
    const req = new Request('http://localhost:3000/trpc/auth.session', {
      headers: { Cookie: 'other=value' }
    })
    const resHeaders = new Headers()
    const ctx = await createContext({ req, resHeaders })
    expect(ctx.user).toBeNull()
  })

  test('returns user with valid session token', async () => {
    const req = new Request('http://localhost:3000/trpc/auth.session', {
      headers: { Cookie: `session=${testUserId}` }
    })
    const resHeaders = new Headers()
    const ctx = await createContext({ req, resHeaders })
    expect(ctx.user).not.toBeNull()
    expect(ctx.user!.id).toBe(testUserId)
    expect(ctx.user!.email).toBe(testUserEmail)
    expect(ctx.user!.name).toBe('Context Test User')
  })

  test('includes db in context', async () => {
    const req = new Request('http://localhost:3000/trpc/auth.session')
    const resHeaders = new Headers()
    const ctx = await createContext({ req, resHeaders })
    expect(ctx.db).toBeDefined()
  })

  test('includes resHeaders in context', async () => {
    const req = new Request('http://localhost:3000/trpc/auth.session')
    const resHeaders = new Headers()
    const ctx = await createContext({ req, resHeaders })
    expect(ctx.resHeaders).toBe(resHeaders)
  })
})
