import { db } from '../../db/connection'
import { orgSessions } from '../../db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import type { SessionRow, DayData, WeekData } from './timesheet.type'

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

async function getWeekData(
  userId: string,
  weekStart: Date,
  weekEnd: Date,
  organizationId?: string,
): Promise<WeekData> {
  const conditions = [
    eq(orgSessions.userId, userId),
    gte(orgSessions.startTime, weekStart),
    lte(orgSessions.startTime, weekEnd),
  ]

  if (organizationId) {
    conditions.push(eq(orgSessions.organizationId, organizationId))
  }

  const sessions = await db
    .select()
    .from(orgSessions)
    .where(and(...conditions))
    .orderBy(desc(orgSessions.startTime))

  const sessionsByDay = new Map<string, SessionRow[]>()

  for (const session of sessions) {
    const dateKey = formatDateKey(session.startTime)
    if (!sessionsByDay.has(dateKey)) {
      sessionsByDay.set(dateKey, [])
    }
    sessionsByDay.get(dateKey)!.push({
      id: session.id,
      organizationId: session.organizationId,
      startTime: session.startTime,
      endTime: session.endTime,
      tasksCompleted: session.tasksCompleted,
      storyPointsCompleted: session.storyPointsCompleted,
      estimatedHoursSum: session.estimatedHoursSum,
      frozen: session.frozen,
      note: session.note,
    })
  }

  const days: DayData[] = []
  let totalDuration = 0
  let totalTasks = 0
  let totalSP = 0

  for (const [date, daySessions] of sessionsByDay) {
    let dayDuration = 0
    let dayTasks = 0
    let daySP = 0

    for (const session of daySessions) {
      if (session.endTime) {
        dayDuration += session.endTime.getTime() - session.startTime.getTime()
      } else {
        dayDuration += Date.now() - session.startTime.getTime()
      }

      dayTasks += session.tasksCompleted ?? 0
      daySP += parseFloat(session.storyPointsCompleted ?? '0')
    }

    totalDuration += dayDuration
    totalTasks += dayTasks
    totalSP += daySP

    days.push({
      date,
      sessions: daySessions,
      totalDuration: dayDuration,
      totalTasks: dayTasks,
      totalSP: daySP,
    })
  }

  days.sort((a, b) => a.date.localeCompare(b.date))

  return {
    days,
    weekStart,
    weekEnd,
    weekTotals: {
      totalDuration,
      totalTasks,
      totalSP,
    },
  }
}

export const timesheetService = {
  getWeekData,
}