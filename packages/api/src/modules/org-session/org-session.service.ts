import { db } from '../../db/connection'
import { orgSessions, tasks } from '../../db/schema'
import { eq, and, isNull, desc, gte, lte, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

function assertNotFrozen(session: typeof orgSessions.$inferSelect): void {
  if (session.frozen) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Session is frozen and cannot be modified' })
  }
}

async function startSession(userId: string, organizationId: string) {
  // Create a new session (no end time yet)
  const [session] = await db
    .insert(orgSessions)
    .values({
      userId,
      organizationId,
      startTime: new Date(),
    })
    .returning()

  return session
}

async function stopSession(sessionId: string, userId: string) {
  const [existing] = await db
    .select()
    .from(orgSessions)
    .where(eq(orgSessions.id, sessionId))
    .limit(1)

  if (!existing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
  }
  if (existing.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your session' })
  }
  if (existing.endTime) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session already stopped' })
  }

  assertNotFrozen(existing)

  const endTime = new Date()

  // Compute enrichment: count tasks completed during this session
  // Only tasks where: assignee_id = userId, status = 'done', completedAt BETWEEN startTime AND endTime
  const enriched = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      totalSp: sql<string | null>`COALESCE(SUM(${tasks.storyPoints}::numeric), '0')`,
      totalHours: sql<string | null>`COALESCE(SUM(${tasks.estimatedHours}::numeric), '0')`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, userId),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, existing.startTime),
        lte(tasks.completedAt, endTime),
      ),
    )

  const tasksCompleted = enriched[0]?.count ?? 0

  const [updated] = await db
    .update(orgSessions)
    .set({
      endTime,
      tasksCompleted,
      storyPointsCompleted: enriched[0]?.totalSp ?? '0',
      estimatedHoursSum: enriched[0]?.totalHours ?? '0',
      updatedAt: new Date(),
    })
    .where(eq(orgSessions.id, sessionId))
    .returning()

  return updated
}

async function getActiveSession(userId: string, organizationId: string) {
  const [session] = await db
    .select()
    .from(orgSessions)
    .where(
      and(
        eq(orgSessions.userId, userId),
        eq(orgSessions.organizationId, organizationId),
        isNull(orgSessions.endTime),
      ),
    )
    .limit(1)

  return session || null
}

async function getAllActiveSessions(userId: string) {
  const sessions = await db
    .select()
    .from(orgSessions)
    .where(and(eq(orgSessions.userId, userId), isNull(orgSessions.endTime)))
    .orderBy(desc(orgSessions.startTime))

  return sessions
}

async function getUserSessions(userId: string, limit = 20) {
  const sessions = await db
    .select()
    .from(orgSessions)
    .where(eq(orgSessions.userId, userId))
    .orderBy(desc(orgSessions.startTime))
    .limit(limit)

  return sessions
}

async function getOldLiveSessions(userId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const sessions = await db
    .select()
    .from(orgSessions)
    .where(
      and(
        eq(orgSessions.userId, userId),
        isNull(orgSessions.endTime),
        lte(orgSessions.startTime, oneDayAgo),
      ),
    )
    .orderBy(desc(orgSessions.startTime))

  return sessions
}

async function retroactivelyCloseSession(
  sessionId: string,
  userId: string,
  endTime: Date,
) {
  const [existing] = await db
    .select()
    .from(orgSessions)
    .where(eq(orgSessions.id, sessionId))
    .limit(1)

  if (!existing) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' })
  }
  if (existing.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your session' })
  }
  if (existing.endTime) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Session already stopped' })
  }

  assertNotFrozen(existing)

  // Compute enrichment against the retroactive end time
  const enriched = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      totalSp: sql<string | null>`COALESCE(SUM(${tasks.storyPoints}::numeric), '0')`,
      totalHours: sql<string | null>`COALESCE(SUM(${tasks.estimatedHours}::numeric), '0')`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, userId),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, existing.startTime),
        lte(tasks.completedAt, endTime),
      ),
    )

  const [updated] = await db
    .update(orgSessions)
    .set({
      endTime,
      tasksCompleted: enriched[0]?.count ?? 0,
      storyPointsCompleted: enriched[0]?.totalSp ?? '0',
      estimatedHoursSum: enriched[0]?.totalHours ?? '0',
      updatedAt: new Date(),
    })
    .where(eq(orgSessions.id, sessionId))
    .returning()

  return updated
}

async function enrichSession(sessionId: string): Promise<void> {
  const [session] = await db
    .select()
    .from(orgSessions)
    .where(eq(orgSessions.id, sessionId))
    .limit(1)

  if (!session) return

  const endTime = session.endTime ?? new Date()

  const enriched = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
      totalSp: sql<string | null>`COALESCE(SUM(${tasks.storyPoints}::numeric), '0')`,
      totalHours: sql<string | null>`COALESCE(SUM(${tasks.estimatedHours}::numeric), '0')`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, session.userId),
        eq(tasks.status, 'done'),
        gte(tasks.completedAt, session.startTime),
        lte(tasks.completedAt, endTime),
      ),
    )

  await db
    .update(orgSessions)
    .set({
      tasksCompleted: enriched[0]?.count ?? 0,
      storyPointsCompleted: enriched[0]?.totalSp ?? '0',
      estimatedHoursSum: enriched[0]?.totalHours ?? '0',
    })
    .where(eq(orgSessions.id, sessionId))
}

async function getSessionById(sessionId: string) {
  const [session] = await db
    .select()
    .from(orgSessions)
    .where(eq(orgSessions.id, sessionId))
    .limit(1)

  return session || null
}

async function reenrichSession(sessionId: string): Promise<void> {
  const session = await getSessionById(sessionId)
  if (!session) return
  if (session.frozen) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Cannot re-enrich frozen session'
    })
  }
  
  await enrichSession(sessionId)
  // Update the updatedAt timestamp
  await db
    .update(orgSessions)
    .set({ updatedAt: new Date() })
    .where(eq(orgSessions.id, sessionId))
}

async function createMinimalSession(
  userId: string,
  organizationId: string,
  startTime: Date,
  endTime: Date,
  task: { storyPoints: string | null; estimatedHours: string | null },
): Promise<void> {
  await db.insert(orgSessions).values({
    userId,
    organizationId,
    startTime,
    endTime,
    note: 'System auto-created',
    tasksCompleted: 1,
    storyPointsCompleted: task.storyPoints || '0',
    estimatedHoursSum: task.estimatedHours || '0',
  })
}

export const orgSessionService = {
  startSession,
  stopSession,
  getActiveSession,
  getAllActiveSessions,
  getUserSessions,
  getOldLiveSessions,
  retroactivelyCloseSession,
  enrichSession,
  reenrichSession,
  createMinimalSession,
}