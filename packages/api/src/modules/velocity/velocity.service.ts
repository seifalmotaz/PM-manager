import { db } from '../../db/connection'
import { tasks, projects, sprints, orgSessions } from '../../db/schema'
import { eq, and, gte, lte, inArray, isNull, desc, isNotNull, sql } from 'drizzle-orm'

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

import type { ChartDataPoint, ChartResult, TimeEfficiencyData, PersonalVelocityRow, PersonalVelocityResult } from './velocity.type'

async function getChartData(input: {
  projectId?: string
  limit?: number
}): Promise<ChartResult> {
  const limit = input.limit ?? 8

  // Query completed sprints ordered by end date
  const completedSprints = await db
    .select()
    .from(sprints)
    .where(eq(sprints.status, 'completed'))
    .orderBy(desc(sprints.endDate))
    .limit(limit)

  // If projectId provided, filter in memory (after query since we need ordered results)
  let filteredSprints = completedSprints
  if (input.projectId) {
    filteredSprints = completedSprints.filter(s => s.projectId === input.projectId)
  }

  const sprintData: ChartDataPoint[] = []
  const timeEfficiencies: TimeEfficiencyData[] = []

  // Batch query: get all sprint IDs
  const sprintIds = filteredSprints.map(s => s.id)

  // Batch query: get all tasks for all sprints (for computeVelocity)
  let allTasksBySprint: Map<string, typeof tasks.$inferSelect[]> = new Map()
  if (sprintIds.length > 0) {
    const allTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.sprintId, sprintIds),
          eq(tasks.status, 'done')
        )
      )

    // Group by sprintId
    for (const task of allTasks) {
      if (task.sprintId) {
        const existing = allTasksBySprint.get(task.sprintId) ?? []
        existing.push(task)
        allTasksBySprint.set(task.sprintId, existing)
      }
    }
  }

  // Batch query: get all session hours for all sprints
  let allSessionsBySprint: Map<string, typeof orgSessions.$inferSelect[]> = new Map()
  if (sprintIds.length > 0) {
    // Get sessions that overlap with any sprint
    // This is an approximation - we get all sessions that might overlap
    const allSessions = await db
      .select()
      .from(orgSessions)
      .where(
        and(
          isNotNull(orgSessions.endTime)
        )
      )

    // Group sessions by which sprint they overlap with
    for (const sprint of filteredSprints) {
      const overlapping = allSessions.filter(s => {
        const sessionStart = s.startTime
        const sessionEnd = s.endTime
        if (!sessionEnd) return false
        // Session overlaps if it started before sprint end and ended after sprint start
        return sessionStart <= sprint.endDate && sessionEnd >= sprint.startDate
      })
      if (overlapping.length > 0) {
        allSessionsBySprint.set(sprint.id, overlapping)
      }
    }
  }

  for (const sprint of filteredSprints) {
    // Planned: sprint.plannedPoints (stored on sprint row from L2)
    const planned = Number(sprint.plannedPoints ?? 0)

    // Completed: use tasks grouped by sprint
    const sprintTasks = allTasksBySprint.get(sprint.id) ?? []
    const completed = sprintTasks.reduce((sum, t) => sum + Number(t.storyPoints || 0), 0)

    sprintData.push({
      sprintId: sprint.id,
      name: sprint.name,
      projectId: sprint.projectId,
      startDate: new Date(sprint.startDate),
      endDate: new Date(sprint.endDate),
      planned,
      completed,
    })

    // Time efficiency: estimated hours / session hours
    const efficiency = computeTimeEfficiencyFromData(sprint, sprintTasks, allSessionsBySprint.get(sprint.id) ?? [])
    timeEfficiencies.push({
      sprintId: sprint.id,
      efficiency,
    })
  }

  return {
    sprints: sprintData,
    timeEfficiencies: timeEfficiencies,
  }
}

async function computeTimeEfficiency(sprintId: string): Promise<number | null> {
  // 1. Get sprint dates
  const [sprint] = await db
    .select()
    .from(sprints)
    .where(eq(sprints.id, sprintId))
    .limit(1)

  if (!sprint) return null

  // 2. Get total estimated hours from completed tasks in this sprint
  const completedTasksResult = await db
    .select({
      estimatedHours: tasks.estimatedHours,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.sprintId, sprintId),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, sprint.startDate),
        lte(tasks.completedAt, sprint.endDate),
      ),
    )

  const totalEstimated = completedTasksResult.reduce((sum, t) => sum + Number(t.estimatedHours ?? 0), 0)

  // 3. Get total session hours during this sprint
  // Query org_sessions where startTime/endTime overlaps sprint
  const sessions = await db
    .select()
    .from(orgSessions)
    .where(
      and(
        gte(orgSessions.startTime, sprint.startDate),
        lte(orgSessions.startTime, sprint.endDate),
        // endTime might be null for live sessions — filter completed only
        isNotNull(orgSessions.endTime),
      ),
    )

  const totalSessionMs = sessions.reduce((sum, s) => {
    if (s.endTime) {
      return sum + (s.endTime.getTime() - s.startTime.getTime())
    }
    return sum
  }, 0)

  const totalSessionHours = totalSessionMs / (1000 * 60 * 60)

  if (totalSessionHours === 0 || totalEstimated === 0) {
    return null // N/A
  }

  return (totalEstimated / totalSessionHours) * 100 // percentage
}

// Helper function that uses pre-fetched data instead of making new queries
function computeTimeEfficiencyFromData(
  sprint: typeof sprints.$inferSelect,
  sprintTasks: { estimatedHours: string | null }[],
  sessions: { startTime: Date; endTime: Date | null }[]
): number | null {
  const totalEstimated = sprintTasks.reduce((sum, t) => sum + Number(t.estimatedHours ?? 0), 0)

  const totalSessionMs = sessions.reduce((sum, s) => {
    if (s.endTime) {
      return sum + (s.endTime.getTime() - s.startTime.getTime())
    }
    return sum
  }, 0)

  const totalSessionHours = totalSessionMs / (1000 * 60 * 60)

  if (totalSessionHours === 0 || totalEstimated === 0) {
    return null // N/A
  }

  return (totalEstimated / totalSessionHours) * 100 // percentage
}

async function getPersonalVelocity(input: {
  userId?: string
  projectId?: string
}): Promise<PersonalVelocityResult> {
  const limit = 8

  // Query completed sprints ordered by end date
  const completedSprints = await db
    .select()
    .from(sprints)
    .where(eq(sprints.status, 'completed'))
    .orderBy(desc(sprints.endDate))
    .limit(limit)

  // If projectId provided, filter in memory
  let filteredSprints = completedSprints
  if (input.projectId) {
    filteredSprints = completedSprints.filter(s => s.projectId === input.projectId)
  }

  const rows: PersonalVelocityRow[] = []

  // Batch query: get all sprint IDs
  const sprintIds = filteredSprints.map(s => s.id)

  // Batch query: get all tasks for all sprints (both user and team)
  let allTasks: typeof tasks.$inferSelect[] = []
  if (sprintIds.length > 0) {
    allTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.sprintId, sprintIds),
          eq(tasks.status, 'done')
        )
      )
  }

  // Group tasks by sprint
  const tasksBySprint = new Map<string, typeof allTasks>()
  for (const task of allTasks) {
    if (task.sprintId) {
      const existing = tasksBySprint.get(task.sprintId) ?? []
      existing.push(task)
      tasksBySprint.set(task.sprintId, existing)
    }
  }

  for (const sprint of filteredSprints) {
    const sprintTasks = tasksBySprint.get(sprint.id) ?? []

    // User's completed tasks in sprint
    const userTasks = sprintTasks.filter(t => t.assigneeId === input.userId)
    const userTaskCount = userTasks.length
    const userSP = userTasks.reduce((sum, t) => sum + Number(t.storyPoints || 0), 0)

    // Team's completed tasks in sprint
    const teamSP = sprintTasks.reduce((sum, t) => sum + Number(t.storyPoints || 0), 0)

    const userShare = teamSP > 0 ? (userSP / teamSP) * 100 : null

    rows.push({
      sprintId: sprint.id,
      sprintName: sprint.name,
      userTasks: userTaskCount,
      userSP,
      teamSP,
      userShare,
    })
  }

  return {
    sprints: rows,
  }
}

export const velocityService = {
  computeVelocity,
  getChartData,
  computeTimeEfficiency,
  getPersonalVelocity,
}