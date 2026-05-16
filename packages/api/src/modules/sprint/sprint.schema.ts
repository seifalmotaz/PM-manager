import { z } from 'zod'

export const createSprintSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(200),
  goal: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
})

export const updateSprintSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  goal: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const completeSprintSchema = z.object({
  sprintId: z.string().uuid(),
  unfinishedTaskAction: z.enum(['backlog', 'next_sprint']),
})