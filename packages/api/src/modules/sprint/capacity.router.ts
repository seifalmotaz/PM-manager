import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { capacityService } from './capacity.service'

const forSprint = protectedProcedure
  .input(z.object({ sprintId: z.string().uuid() }))
  .query(({ input, ctx }) => {
    return capacityService.getCapacityTable(input.sprintId, ctx.user.id)
  })

const set = protectedProcedure
  .input(
    z.object({
      sprintId: z.string().uuid(),
      userId: z.string().uuid(),
      capacityHours: z.number().min(0),
      note: z.string().optional(),
    }),
  )
  .mutation(({ input, ctx }) => {
    return capacityService.setCapacity(input, ctx.user.id)
  })

export const capacityRouter = router({ forSprint, set })