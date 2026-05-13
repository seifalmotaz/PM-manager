import { z } from 'zod'
import { router, protectedProcedure } from '../../trpc'
import { TRPCError } from '@trpc/server'
import { velocityService } from './velocity.service'
import { sprintService } from '../sprint/sprint.service'
import { projectService } from '../project/project.service'
import { workspaceService } from '../workspace/workspace.service'

const live = protectedProcedure.input(z.object({ sprintId: z.string().uuid() })).query(async ({ input, ctx }) => {
  const sprint = await sprintService.getSprint(input.sprintId, ctx.user.id)
  return velocityService.computeVelocity({
    startDate: new Date(sprint.startDate),
    endDate: new Date(),
    sprintId: sprint.id,
  })
})

const snapshot = protectedProcedure
  .input(z.object({ sprintId: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    const sprint = await sprintService.getSprint(input.sprintId, ctx.user.id)

    if (sprint.status !== 'completed') {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Snapshot only available for completed sprints',
      })
    }

    return velocityService.computeVelocity({
      startDate: new Date(sprint.startDate),
      endDate: new Date(sprint.endDate),
      sprintId: sprint.id,
    })
  })

const custom = protectedProcedure
  .input(
    z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      workspaceIds: z.array(z.string().uuid()).optional(),
      projectIds: z.array(z.string().uuid()).optional(),
      userId: z.string().uuid().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const startDate = new Date(input.startDate)
    const endDate = new Date(input.endDate)

    if (startDate > endDate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End date must be after start date',
      })
    }

    const validWsIds: string[] = []
    if (input.workspaceIds?.length) {
      for (const wsId of input.workspaceIds) {
        try {
          await workspaceService.getWorkspace(wsId, ctx.user.id)
          validWsIds.push(wsId)
        } catch {
          // skip - user doesn't have access
        }
      }
      if (validWsIds.length === 0) {
        return { completedPoints: 0, flaggedTasks: [], taskCount: 0 }
      }
    }

    const validProjectIds: string[] = []
    if (input.projectIds?.length) {
      for (const projectId of input.projectIds) {
        try {
          await projectService.getProject(projectId, ctx.user.id)
          validProjectIds.push(projectId)
        } catch {
          // skip - user doesn't have access
        }
      }
      if (validProjectIds.length === 0) {
        return { completedPoints: 0, flaggedTasks: [], taskCount: 0 }
      }
    }

    return velocityService.computeVelocity({
      startDate,
      endDate,
      workspaceIds: validWsIds.length > 0 ? validWsIds : undefined,
      projectIds: validProjectIds.length > 0 ? validProjectIds : undefined,
      userId: input.userId,
    })
  })

export const velocityRouter = router({ live, snapshot, custom })