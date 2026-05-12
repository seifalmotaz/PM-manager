import { initTRPC, TRPCError } from '@trpc/server'
import { db } from './db/connection'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

/**
 * Parse session cookie from Cookie header string.
 * Returns the session token value or null.
 */
function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]*)/)
  return match ? match[1] : null
}

export async function createContext(opts: { req: Request; resHeaders: Headers }) {
  const cookieHeader = opts.req.headers.get('Cookie')
  const sessionToken = parseSessionCookie(cookieHeader)

  let user: typeof users.$inferSelect | null = null

  if (sessionToken) {
    try {
      // Validate UUID format before querying
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(sessionToken)) {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, sessionToken))
          .limit(1)
        user = result[0] || null
      }
    } catch {
      user = null
    }
  }

  return {
    user,
    db,
    req: opts.req,
    resHeaders: opts.resHeaders,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

// Middleware that enforces authentication
const authMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }
  return next({
    ctx: {
      user: ctx.user, // narrowed to non-null
    },
  })
})

export const protectedProcedure = t.procedure.use(authMiddleware)
