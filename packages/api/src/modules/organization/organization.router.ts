import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { organizationService } from './organization.service'

export const organizationRouter = router({
  getSettings: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      return organizationService.getOrCreateSettings(input.organizationId)
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        defaultSprintLengthDays: z.number().optional(),
        workingHoursStart: z.string().optional(),
        workingHoursEnd: z.string().optional(),
        workingDays: z.array(z.number()).optional(),
        timezone: z.string().optional(),
        requireClockIn: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { organizationId, ...updates } = input
      return organizationService.updateSettings(organizationId, updates)
    }),
})