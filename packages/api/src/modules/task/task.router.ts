import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../../trpc'
import { taskService } from './task.service'
import { parseTaskInput } from './nlp-parser'
import { orgSessions } from '../../db/schema'
import { db } from '../../db/connection'
import { orgProcedure } from '../../middleware/org-access'

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
        status: z.enum(['todo', 'in_progress', 'done']).optional(),
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

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      return taskService.deleteTask(input.id, ctx.user.id)
    }),

  changeStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['todo', 'in_progress', 'done']),
      }),
    )
    .mutation(({ input, ctx }) => {
      return taskService.changeStatus(input.id, input.status, ctx.user.id)
    }),

  home: protectedProcedure
    .input(
      z.object({
        workspaceIds: z.array(z.string().uuid()),
        assigneeId: z.string().uuid().optional(),
      }),
    )
    .query(({ input, ctx }) => {
      return taskService.listHome(input.workspaceIds, ctx.user.id, input.assigneeId)
    }),

  homeWithOrganization: protectedProcedure
    .input(z.object({
      workspaceIds: z.array(z.string().uuid()),
    }))
    .query(async ({ input, ctx }) => {
      return taskService.listTasksWithOrganization(input.workspaceIds, ctx.user.id)
    }),

  overdueCount: protectedProcedure.query(({ ctx }) => {
    return taskService.getOverdueCount(ctx.user.id)
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1), workspaceIds: z.array(z.string().uuid()).optional() }))
    .query(({ input, ctx }) => taskService.searchTasks(input.query, input.workspaceIds, ctx.user.id)),

  listByOrg: orgProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return taskService.listTasksByOrg(ctx.organizationId!, ctx.user.id)
    }),

  completeWithCrossOrgSession: protectedProcedure
    .input(z.object({
      taskId: z.string().uuid(),
      organizationId: z.string(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // First change the task status to done
      const task = await taskService.changeStatus(input.taskId, 'done', ctx.user.id)

      // Create a backdated org session for the cross-org work
      const startTime = input.startTime
        ? new Date(input.startTime)
        : (task.startedAt || new Date())
      const endTime = input.endTime
        ? new Date(input.endTime)
        : new Date()

      const [session] = await db
        .insert(orgSessions)
        .values({
          userId: ctx.user.id,
          organizationId: input.organizationId,
          startTime,
          endTime,
          tasksCompleted: 1,
          storyPointsCompleted: task.storyPoints || '0',
          estimatedHoursSum: task.estimatedHours || '0',
          note: 'Auto-created from cross-org completion',
        })
        .returning()

      return { task, session }
    }),
})
