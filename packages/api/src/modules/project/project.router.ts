import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../../trpc'
import { projectService } from './project.service'

export const projectRouter = router({
  listByOrg: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return projectService.listByOrg(input.organizationId, ctx.user.id)
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid().optional(),
      }),
    )
    .query(({ input, ctx }) => {
      return projectService.listProjects(input.workspaceId, ctx.user.id)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return projectService.getProject(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return projectService.createProject(input, ctx.user.id)
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return projectService.updateProject(input.id, input, ctx.user.id)
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      return projectService.deleteProject(input.id, ctx.user.id)
    }),
})
