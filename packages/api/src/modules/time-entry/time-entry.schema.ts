import { z } from 'zod'

export const createTimeEntrySchema = z.object({
  taskId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  note: z.string().optional(),
})