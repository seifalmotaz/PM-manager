import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { taskService } from './task.service'
import { parseTaskInput } from './nlp-parser'

export const taskRouter = router({
  parse: protectedProcedure
    .input(z.object({ input: z.string() }))
    .query(({ input }) => {
      return parseTaskInput(input.input)
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceIds: z.array(z.string().uuid()).optional(),
        projectId: z.string().uuid().optional(),
        sprintId: z.string().uuid().optional(),
        status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
        assigneeId: z.string().uuid().optional(),
      }),
    )
    .query(({ input, ctx }) => {
      return taskService.listTasks(input, ctx.user.id)
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input, ctx }) => {
      return taskService.getTask(input.id, ctx.user.id)
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().min(1).max(500),
        priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
        storyPoints: z.number().min(0).optional(),
        estimatedHours: z.number().min(0).optional(),
        assigneeId: z.string().uuid().optional(),
        dueDate: z.string().datetime().optional(),
        sprintId: z.string().uuid().optional(),
        description: z.string().optional(),
        sprintFlag: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.createTask(input, ctx.user.id)
    }),

  update: protectedProcedure
    .input(
      z.object({
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
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.updateTask(input.id, input, ctx.user.id)
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      return taskService.deleteTask(input.id, ctx.user.id)
    }),

  changeStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['todo', 'in_progress', 'review', 'done']),
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.changeStatus(input.id, input.status, ctx.user.id)
    }),

  home: protectedProcedure
    .input(
      z.object({
        workspaceIds: z.array(z.string().uuid()),
      }),
    )
    .query(({ input, ctx }) => {
      return taskService.listHome(input.workspaceIds, ctx.user.id)
    }),

  overdueCount: protectedProcedure.query(({ ctx }) => {
    return taskService.getOverdueCount(ctx.user.id)
  }),
})
