import { z } from 'zod'

export const createChecklistItemSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1).max(1000),
})

export const updateChecklistItemSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(1000),
})

export const toggleChecklistItemSchema = z.object({
  id: z.string().uuid(),
  isCompleted: z.boolean(),
})