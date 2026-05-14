import { z } from 'zod'

export const createCommentSchema = z.object({
  entityType: z.enum(['task', 'sprint', 'project']),
  entityId: z.string().uuid(),
  content: z.string().min(1).max(5000),
})

export const updateCommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(5000),
})