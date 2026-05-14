import { db } from '../../db/connection'
import { tasks, sprints } from '../../db/schema'
import { eq, isNull, and, desc, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { projectService } from '../project/project.service'
import type { ForecastResult } from './forecast.type'

/**
 * Forecast: given a project's backlog and historical sprint velocity,
 * predict how many sprints are needed to clear the backlog.
 */
async function forProject(projectId: string, userId: string): Promise<ForecastResult> {
  // Verify project access
  await projectService.getProject(projectId, userId)

  // 1. Get all backlog tasks (sprintId IS NULL) for this project, ordered by priority
  const backlog = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      storyPoints: tasks.storyPoints,
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.sprintId), eq(tasks.status, 'todo')))
    .orderBy(
      sql`CASE
        WHEN ${tasks.priority} = 'p0' THEN 0
        WHEN ${tasks.priority} = 'p1' THEN 1
        WHEN ${tasks.priority} = 'p2' THEN 2
        WHEN ${tasks.priority} = 'p3' THEN 3
        ELSE 4 END`
    )

  const totalBacklogSP = backlog.reduce((sum, t) => sum + Number(t.storyPoints || 0), 0)

  // 2. Get the last 3 completed sprints to calculate average velocity
  const completedSprints = await db
    .select({
      id: sprints.id,
      plannedPoints: sprints.plannedPoints,
      endDate: sprints.endDate,
    })
    .from(sprints)
    .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'completed')))
    .orderBy(desc(sprints.endDate))
    .limit(3)

  // No data case
  if (completedSprints.length === 0) {
    return {
      totalBacklogSP,
      backlogTaskCount: backlog.length,
      avgVelocity: 0,
      sprintsNeeded: 0,
      hasData: false,
      breakdown: [],
    }
  }

  // Average velocity from planned points (set at sprint lock time)
  const totalVelocity = completedSprints.reduce((sum, s) => sum + Number(s.plannedPoints || 0), 0)
  const avgVelocity = totalVelocity / completedSprints.length

  if (avgVelocity === 0) {
    return {
      totalBacklogSP,
      backlogTaskCount: backlog.length,
      avgVelocity: 0,
      sprintsNeeded: 0,
      hasData: false,
      breakdown: [],
    }
  }

  // 3. Build sprint-by-sprint breakdown
  const sprintsNeeded = Math.ceil(totalBacklogSP / avgVelocity)
  const breakdown: ForecastResult['breakdown'] = []
  let remainingSP = totalBacklogSP

  // Get the last completed sprint's end date as the starting point
  const lastCompletedEnd = new Date(completedSprints[0].endDate)

  // Estimate sprint duration from completed sprints (average duration)
  // If we can't compute duration (only one sprint), default to 14 days
  let avgSprintDays = 14
  if (completedSprints.length >= 2) {
    // Get the sprint with startDate too
    const sprintsWithDates = await db
      .select({ startDate: sprints.startDate, endDate: sprints.endDate })
      .from(sprints)
      .where(and(eq(sprints.projectId, projectId), eq(sprints.status, 'completed')))
      .orderBy(desc(sprints.endDate))
      .limit(3)

    if (sprintsWithDates.length >= 2) {
      const durations = sprintsWithDates.map((s) => {
        const days = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24)
        return Math.max(1, Math.round(days))
      })
      avgSprintDays = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    }
  }

  for (let i = 0; i < sprintsNeeded; i++) {
    const allocatedSP = Math.min(avgVelocity, remainingSP)
    // Estimate task count proportionally
    const taskCount = Math.max(1, Math.round((allocatedSP / totalBacklogSP) * backlog.length))

    const startDate = new Date(lastCompletedEnd)
    startDate.setDate(startDate.getDate() + i * avgSprintDays)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + avgSprintDays)

    breakdown.push({
      sprintNumber: i + 1,
      estimatedSP: Math.round(allocatedSP * 10) / 10,
      taskCount,
      estimatedStartDate: startDate.toISOString(),
      estimatedEndDate: endDate.toISOString(),
    })

    remainingSP -= allocatedSP
  }

  return {
    totalBacklogSP: Math.round(totalBacklogSP * 10) / 10,
    backlogTaskCount: backlog.length,
    avgVelocity: Math.round(avgVelocity * 10) / 10,
    sprintsNeeded,
    hasData: true,
    breakdown,
  }
}

export const forecastService = { forProject }