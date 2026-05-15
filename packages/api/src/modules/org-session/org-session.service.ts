import { db } from '../../db/connection'
import { orgSessions } from '../../db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

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
  // Verify session belongs to user
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

  // Stop the session
  // TODO L1: Compute enrichment (tasksCompleted, storyPointsCompleted, estimatedHoursSum)
  const [updated] = await db
    .update(orgSessions)
    .set({
      endTime: new Date(),
      tasksCompleted: 0, // Placeholder - L1 will compute
      storyPointsCompleted: '0',
      estimatedHoursSum: '0',
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
        isNull(orgSessions.endTime)
      )
    )
    .limit(1)

  return session || null
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

export const orgSessionService = {
  startSession,
  stopSession,
  getActiveSession,
  getUserSessions,
}