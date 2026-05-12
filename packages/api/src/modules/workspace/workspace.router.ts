import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { workspaceService } from './workspace.service'

export const workspaceRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return workspaceService.listUserWorkspaces(ctx.user.id)
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
      }),
    )
    .mutation(({ input, ctx }) => {
      return workspaceService.createCompanyWorkspace(input.name, ctx.user.id)
    }),

  members: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return workspaceService.listMembers(input.workspaceId, ctx.user.id)
    }),
})
