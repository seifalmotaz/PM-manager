import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { commentService } from './comment.service'
import { createCommentSchema, updateCommentSchema } from './comment.schema'

export const commentRouter = router({
  list: protectedProcedure
    .input(z.object({ entityType: z.enum(['task', 'sprint', 'project']), entityId: z.string().uuid() }))
    .query(({ input, ctx }) => commentService.list(input.entityType, input.entityId, ctx.user.id)),

  create: protectedProcedure
    .input(createCommentSchema)
    .mutation(({ input, ctx }) => commentService.create(input, ctx.user.id)),

  update: protectedProcedure
    .input(updateCommentSchema)
    .mutation(({ input, ctx }) => commentService.update(input.id, input.content, ctx.user.id)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => commentService.delete(input.id, ctx.user.id)),
})