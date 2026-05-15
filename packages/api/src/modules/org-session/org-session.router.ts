import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { orgSessionService } from './org-session.service'

export const orgSessionRouter = router({
  start: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return orgSessionService.startSession(ctx.user.id, input.organizationId)
    }),

  stop: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return orgSessionService.stopSession(input.sessionId, ctx.user.id)
    }),

  getActive: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return orgSessionService.getActiveSession(ctx.user.id, input.organizationId)
    }),

  getAllActive: protectedProcedure.query(async ({ ctx }) => {
    return orgSessionService.getAllActiveSessions(ctx.user.id)
  }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return orgSessionService.getUserSessions(ctx.user.id, input.limit ?? 20)
    }),

  getOldLive: protectedProcedure.query(async ({ ctx }) => {
    return orgSessionService.getOldLiveSessions(ctx.user.id)
  }),

  retroactivelyClose: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      endTime: z.string().datetime(),
    }))
    .mutation(async ({ ctx, input }) => {
      return orgSessionService.retroactivelyCloseSession(
        input.sessionId,
        ctx.user.id,
        new Date(input.endTime),
      )
    }),
})