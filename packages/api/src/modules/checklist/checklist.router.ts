import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { checklistService } from './checklist.service'
import { createChecklistItemSchema, updateChecklistItemSchema, toggleChecklistItemSchema } from './checklist.schema'

export const checklistRouter = router({
  list: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(({ input, ctx }) => checklistService.list(input.taskId, ctx.user.id)),

  create: protectedProcedure
    .input(createChecklistItemSchema)
    .mutation(({ input, ctx }) => checklistService.create(input.taskId, input.content, ctx.user.id)),

  update: protectedProcedure
    .input(updateChecklistItemSchema)
    .mutation(({ input, ctx }) => checklistService.update(input.id, input.content, ctx.user.id)),

  toggle: protectedProcedure
    .input(toggleChecklistItemSchema)
    .mutation(({ input, ctx }) => checklistService.toggle(input.id, input.isCompleted, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => checklistService.delete(input.id, ctx.user.id)),

  reorder: protectedProcedure
    .input(z.object({ taskId: z.string().uuid(), itemIds: z.array(z.string().uuid()) }))
    .mutation(({ input, ctx }) => checklistService.reorder(input.taskId, input.itemIds, ctx.user.id)),
})