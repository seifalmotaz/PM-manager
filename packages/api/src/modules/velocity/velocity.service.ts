import { db } from '../../db/connection'
import { tasks, projects } from '../../db/schema'
import { eq, and, gte, lte, inArray, isNull } from 'drizzle-orm'

export interface VelocityInput {
  startDate: Date
  endDate: Date
  workspaceIds?: string[]
  projectIds?: string[]
  sprintId?: string
  userId?: string
}

export interface VelocityResult {
  completedPoints: number
  plannedPoints?: number
  overVelocity?: number
  flaggedTasks: Array<{
    taskId: string
    title: string
    storyPoints: number
    sprintFlag: string
    completedAt: Date
  }>
  taskCount: number
}

async function computeVelocity(input: VelocityInput): Promise<VelocityResult> {
  const conditions: ReturnType<typeof eq>[] = [
    gte(tasks.completedAt, input.startDate),
    lte(tasks.completedAt, input.endDate),
    eq(tasks.status, 'done'),
  ]

  if (input.projectIds?.length) {
    conditions.push(inArray(tasks.projectId, input.projectIds))
  }

  if (input.workspaceIds?.length) {
    const matchingProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.workspaceId, input.workspaceIds))

    const matchingProjectIds = matchingProjects.map((p) => p.id)

    if (matchingProjectIds.length === 0) {
      return { completedPoints: 0, flaggedTasks: [], taskCount: 0 }
    }

    conditions.push(inArray(tasks.projectId, matchingProjectIds))
  }

  if (input.userId) {
    conditions.push(eq(tasks.assigneeId, input.userId))
  }

  const completedTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      storyPoints: tasks.storyPoints,
      sprintFlag: tasks.sprintFlag,
      sprintId: tasks.sprintId,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(and(...conditions))

  const completedPoints = completedTasks.reduce((sum, t) => sum + Number(t.storyPoints || 0), 0)

  let plannedPoints: number | undefined
  let overVelocity: number | undefined

  if (input.sprintId) {
    const plannedTasks = await db
      .select({ storyPoints: tasks.storyPoints })
      .from(tasks)
      .where(and(eq(tasks.sprintId, input.sprintId), isNull(tasks.sprintFlag)))

    plannedPoints = plannedTasks.reduce((sum, t) => sum + Number(t.storyPoints || 0), 0)
    overVelocity = plannedPoints > 0 ? completedPoints / plannedPoints : undefined
  }

  const flaggedTasks = completedTasks
    .filter((t) => t.sprintFlag !== null)
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      storyPoints: Number(t.storyPoints || 0),
      sprintFlag: t.sprintFlag as string,
      completedAt: t.completedAt as Date,
    }))

  return {
    completedPoints,
    plannedPoints,
    overVelocity,
    flaggedTasks,
    taskCount: completedTasks.length,
  }
}

export const velocityService = { computeVelocity }