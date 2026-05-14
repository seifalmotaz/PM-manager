import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { timeEntryService } from './time-entry.service'
import { createTimeEntrySchema } from './time-entry.schema'

export const timeEntryRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(({ input, ctx }) => timeEntryService.list(input.taskId, ctx.user.id)),

  running: protectedProcedure
    .query(({ ctx }) => timeEntryService.getRunning(ctx.user.id)),

  start: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .mutation(({ input, ctx }) => timeEntryService.start(input.taskId, ctx.user.id)),

  stop: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => timeEntryService.stop(input.id, ctx.user.id)),

  create: protectedProcedure
    .input(createTimeEntrySchema)
    .mutation(({ input, ctx }) => timeEntryService.createManual(input, ctx.user.id)),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      note: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => timeEntryService.update(input.id, input, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => timeEntryService.delete(input.id, ctx.user.id)),
})