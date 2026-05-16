import { TRPCError } from '@trpc/server'
import { protectedProcedure } from '../trpc'
import { db } from '../db/connection'
import { workspaces, workspaceMembers } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import type { Context, OrgMembershipCache } from '../trpc'
import { WorkOS } from '@workos-inc/node'
import type { OrganizationMembership } from '@workos-inc/node'
import { z } from 'zod'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const workos = new WorkOS(process.env.WORKOS_API_KEY!, {
  clientId: process.env.WORKOS_CLIENT_ID!,
})

// Validate user membership in org (with caching)
async function validateOrgMembership(
  userId: string,
  organizationId: string,
  ctx: Context
): Promise<void> {
  // Get current memberships map or initialize
  let membershipsMap = ctx.orgMemberships
  if (membershipsMap === null) {
    membershipsMap = new Map<string, OrgMembershipCache[]>()
    ctx.orgMemberships = membershipsMap
  }

  // Check cache
  const cached = membershipsMap.get(userId)
  if (cached !== undefined) {
    const found = cached.find((c: OrgMembershipCache) => c.orgId === organizationId)
    if (found && Date.now() - found.cachedAt.getTime() < CACHE_TTL_MS) {
      return // Cache hit, membership valid
    }
  }

  // Check database: user has workspace membership in any workspace belonging to this org
  // Use a two-step query to avoid Drizzle join issues
  const userWorkspaces = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))

  const workspaceIds = userWorkspaces.map(w => w.workspaceId)

  if (workspaceIds.length > 0) {
    const matchingWorkspaces = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(
        inArray(workspaces.id, workspaceIds),
        eq(workspaces.organizationId, organizationId),
      ))
      .limit(1)

    if (matchingWorkspaces.length > 0) {
      // Cache this membership
      const existingCache = membershipsMap.get(userId) || []
      const updatedCache = existingCache.filter((c: OrgMembershipCache) => c.orgId !== organizationId)
      updatedCache.push({ orgId: organizationId, orgName: '', cachedAt: new Date() })
      membershipsMap.set(userId, updatedCache)
      return
    }
  }

  // Fallback: Check WorkOS memberships (slower, external API call)
  try {
    const workosUserId = (ctx as Context & { workosUserId?: string }).workosUserId
    if (!workosUserId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this organization' })
    }

    const memberships = await workos.userManagement.listOrganizationMemberships({
      userId: workosUserId,
    })

    const orgIds = memberships.data.map((m: OrganizationMembership) => m.organizationId)
    if (!orgIds.includes(organizationId)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this organization' })
    }

    // Cache memberships
    membershipsMap.set(userId, memberships.data.map((m: OrganizationMembership) => ({
      orgId: m.organizationId,
      orgName: m.organizationName || '',
      cachedAt: new Date(),
    })))
  } catch (error) {
    if (error instanceof TRPCError) throw error
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this organization' })
  }
}

export const orgProcedure = protectedProcedure
  .input(z.object({ organizationId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const userId = ctx.user!.id
    const organizationId = (input as { organizationId: string }).organizationId
    await validateOrgMembership(userId, organizationId, ctx)
    return next({
      ctx: {
        ...ctx,
        organizationId,
      },
    })
  })

// For procedures that have orgId in a different field name
export function createOrgProcedure(fieldName: string = 'organizationId') {
  return protectedProcedure.use(async ({ ctx, input, next }) => {
    if (!input) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization ID required' })
    }
    const rawInput = input as unknown as Record<string, unknown>
    const organizationId = rawInput[fieldName] as string | undefined

    if (!organizationId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization ID required' })
    }

    await validateOrgMembership(ctx.user!.id, organizationId, ctx)

    return next({
      ctx: {
        ...ctx,
        organizationId,
      },
    })
  })
}