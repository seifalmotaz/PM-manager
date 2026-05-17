import { z } from 'zod'
import { router, protectedProcedure, adminProcedure, checkOrgAdmin } from '../../trpc'
import { workspaceService } from './workspace.service'

export const workspaceRouter = router({
  list: protectedProcedure
    .input(z.object({ organizationId: z.string().optional() }))
    .query(({ input, ctx }) => {
      return workspaceService.listUserWorkspaces(ctx.user.id, input.organizationId)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return workspaceService.getWorkspace(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        organizationId: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await checkOrgAdmin(ctx, input.organizationId)
      return workspaceService.createCompanyWorkspace(input.name, ctx.user.id, input.organizationId)
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100),
      }),
    )
    .mutation(({ input, ctx }) => {
      return workspaceService.updateWorkspace(input.id, ctx.user.id, { name: input.name })
    }),

  members: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return workspaceService.listMembers(input.workspaceId, ctx.user.id)
    }),

  removeMember: adminProcedure
    .input(z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(({ input, ctx }) => workspaceService.removeMember(input.workspaceId, input.userId, ctx.user.id)),
})
