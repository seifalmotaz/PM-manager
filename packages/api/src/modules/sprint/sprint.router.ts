import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { sprintService } from './sprint.service'
import { createSprintSchema, updateSprintSchema } from './sprint.schema'

export const sprintRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(({ input, ctx }) => sprintService.listByProject(input.projectId, ctx.user.id)),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => sprintService.getSprint(input.id, ctx.user.id)),

  create: protectedProcedure
    .input(createSprintSchema)
    .mutation(({ input, ctx }) => sprintService.createSprint(input, ctx.user.id)),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid() }).merge(updateSprintSchema))
    .mutation(({ input, ctx }) => {
      const { id, ...updates } = input
      return sprintService.updateSprint(id, updates, ctx.user.id)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid(), deleteTasks: z.boolean() }))
    .mutation(({ input, ctx }) =>
      sprintService.deleteSprint(input.id, ctx.user.id, input.deleteTasks),
    ),
})