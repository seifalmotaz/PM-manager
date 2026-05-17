import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { organizationService } from './organization.service'
import { workspaceService } from '../workspace/workspace.service'
import { TRPCError } from '@trpc/server'

export const organizationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Return organizations derived from user's workspaces
    const workspaces = await workspaceService.listUserWorkspaces(ctx.user.id)
    const orgMap = new Map<string, { id: string; name: string; slug: string }>()

    for (const ws of workspaces) {
      if (ws.organizationId) {
        // Use workspace name as org name for personal workspaces
        const orgName = ws.type === 'personal' ? 'Personal' : ws.name
        const orgSlug = (orgName).toLowerCase().replace(/\s+/g, '-')
        orgMap.set(ws.organizationId, {
          id: ws.organizationId,
          name: orgName,
          slug: orgSlug,
        })
      }
    }

    return Array.from(orgMap.values())
  }),

  getSettings: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      return organizationService.getOrCreateSettings(input.organizationId)
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        defaultSprintLengthDays: z.number().optional(),
        workingHoursStart: z.string().optional(),
        workingHoursEnd: z.string().optional(),
        workingDays: z.array(z.number()).optional(),
        timezone: z.string().optional(),
        requireClockIn: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { organizationId, ...updates } = input
      return organizationService.updateSettings(organizationId, updates)
    }),

  create: protectedProcedure
    .input(z.object({ orgName: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.workosUserId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'WorkOS user ID not found' })
      }
      const result = await organizationService.createOrganization(
        ctx.user.id,
        ctx.user.workosUserId,
        input.orgName
      )
      return result
    }),
})