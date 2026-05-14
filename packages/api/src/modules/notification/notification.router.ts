import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { notificationService } from './notification.service'

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20), offset: z.number().min(0).default(0) }))
    .query(({ input, ctx }) => notificationService.list(ctx.user.id, input.limit, input.offset)),

  unreadCount: protectedProcedure
    .query(({ ctx }) => notificationService.unreadCount(ctx.user.id)),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => notificationService.markRead(input.id, ctx.user.id)),

  markAllRead: protectedProcedure
    .mutation(({ ctx }) => notificationService.markAllRead(ctx.user.id)),
})