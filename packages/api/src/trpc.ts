import { initTRPC, TRPCError } from '@trpc/server'
import { db } from './db/connection'
import { users, workspaceMembers, projects, sprints, tasks } from './db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Parse session cookie from Cookie header string.
 * Returns the session token value or null.
 */
function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]*)/)
  return match ? match[1] : null
}

export interface OrgMembershipCache {
  orgId: string
  orgName: string
  cachedAt: Date
}

export async function createContext(opts: { req: Request; resHeaders: Headers }) {
  const cookieHeader = opts.req.headers.get('Cookie')
  const sessionToken = parseSessionCookie(cookieHeader)

  let user: typeof users.$inferSelect | null = null
  let organizationId: string | null = null // L0 stub - always null

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
    organizationId, // L0 stub - L1 will populate from WorkOS session
    orgMemberships: null as Map<string, OrgMembershipCache[]> | null,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

/**
 * Get a user's role in a workspace. Returns null if not a member.
 */
export async function getMemberRole(userId: string, workspaceId: string): Promise<string | null> {
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId),
    ))
    .limit(1)
  return member?.role ?? null
}

/**
 * Resolve which workspace a procedure input targets.
 * Tries: direct workspaceId → projectId → sprintId → task id → comment entity resolution.
 */
async function resolveWorkspaceId(rawInput: unknown): Promise<string> {
  const input = rawInput as Record<string, unknown>

  // Direct workspaceId
  if (input.workspaceId && typeof input.workspaceId === 'string') return input.workspaceId

  // From projectId
  if (input.projectId && typeof input.projectId === 'string') {
    const [project] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1)
    if (project) return project.workspaceId
  }

  // From sprintId
  if (input.sprintId && typeof input.sprintId === 'string') {
    const [sprint] = await db
      .select({ projectId: sprints.projectId })
      .from(sprints)
      .where(eq(sprints.id, input.sprintId))
      .limit(1)
    if (sprint) {
      const [project] = await db
        .select({ workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, sprint.projectId))
        .limit(1)
      if (project) return project.workspaceId
    }
  }

  // Try projects table (for project delete which uses `id`)
  if (input.id && typeof input.id === 'string') {
    const [project] = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, input.id))
      .limit(1)
    if (project) return project.workspaceId
  }

  // From task ID (commonly `id` field for delete operations on tasks)
  if (input.id && typeof input.id === 'string') {
    // Try tasks table
    const [task] = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, input.id))
      .limit(1)
    if (task) {
      const [project] = await db
        .select({ workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, task.projectId))
        .limit(1)
      if (project) return project.workspaceId
    }

    // Try sprints table (for sprint delete which also has `id`)
    const [sprint] = await db
      .select({ projectId: sprints.projectId })
      .from(sprints)
      .where(eq(sprints.id, input.id))
      .limit(1)
    if (sprint) {
      const [project] = await db
        .select({ workspaceId: projects.workspaceId })
        .from(projects)
        .where(eq(projects.id, sprint.projectId))
        .limit(1)
      if (project) return project.workspaceId
    }
  }

  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot resolve workspace from procedure input' })
}

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

/**
 * Procedure that requires Admin or Owner role in the target workspace.
 * Uses resolveWorkspaceId to determine which workspace from the input.
 */
export const adminProcedure = protectedProcedure.use(
  t.middleware(async ({ ctx, input, next }) => {
    const workspaceId = await resolveWorkspaceId(input)
    const role = await getMemberRole(ctx.user!.id, workspaceId)

    if (role !== 'admin' && role !== 'owner') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Admin access required for this operation',
      })
    }

    return next()
  }),
)
