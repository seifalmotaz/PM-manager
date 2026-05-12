import { z } from 'zod'

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
  storyPoints: z.number().min(0).optional(),
  estimatedHours: z.number().min(0).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  sprintId: z.string().uuid().optional(),
  sprintFlag: z.string().optional(),
  description: z.string().optional(),
})

export const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).nullable().optional(),
  storyPoints: z.number().min(0).nullable().optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  deadline: z.string().datetime().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  sprintFlag: z.string().nullable().optional(),
  description: z.string().optional(),
})

export const changeStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
})

export const taskIdSchema = z.object({
  id: z.string().uuid(),
})

export const parseInputSchema = z.object({
  input: z.string(),
})

export const homeInputSchema = z.object({
  workspaceIds: z.array(z.string().uuid()),
})
