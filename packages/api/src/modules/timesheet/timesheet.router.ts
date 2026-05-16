import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { timesheetService } from './timesheet.service'

export const timesheetRouter = router({
  listByWeek: protectedProcedure
    .input(z.object({
      weekStart: z.string().datetime(),
      weekEnd: z.string().datetime(),
      organizationId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const weekStart = new Date(input.weekStart)
      const weekEnd = new Date(input.weekEnd)
      return timesheetService.getWeekData(ctx.user.id, weekStart, weekEnd, input.organizationId)
    }),
})