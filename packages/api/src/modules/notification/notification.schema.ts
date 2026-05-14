import { z } from 'zod'

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['assigned', 'deadline_soon', 'sprint_started', 'sprint_ended', 'mentioned']),
  title: z.string().min(1),
  body: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
})