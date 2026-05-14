import { db } from '../../db/connection'
import { timeEntries } from '../../db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { taskService } from '../task/task.service'

async function list(taskId: string, userId: string) {
  await taskService.getTask(taskId, userId)

  return db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.taskId, taskId), eq(timeEntries.userId, userId)))
    .orderBy(desc(timeEntries.startTime))
}

async function getRunning(userId: string) {
  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endTime)))
    .limit(1)

  if (!entry) return null

  // Include task title for UI display
  const task = await taskService.getTask(entry.taskId, userId)
  return { ...entry, task: { id: task.id, title: task.title } }
}

async function start(taskId: string, userId: string) {
  await taskService.getTask(taskId, userId)

  // If there's already a running entry, stop it first
  const [running] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endTime)))
    .limit(1)

  if (running) {
    const now = new Date()
    const durationMinutes = (now.getTime() - running.startTime.getTime()) / 60000
    await db
      .update(timeEntries)
      .set({ endTime: now, durationMinutes: String(durationMinutes) })
      .where(eq(timeEntries.id, running.id))
  }

  const [entry] = await db
    .insert(timeEntries)
    .values({ taskId, userId, startTime: new Date(), isManual: false })
    .returning()

  return entry
}

async function stop(id: string, userId: string) {
  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, id))
    .limit(1)

  if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' })
  if (entry.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your time entry' })
  if (entry.endTime) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Timer is already stopped' })

  const now = new Date()
  const durationMinutes = (now.getTime() - entry.startTime.getTime()) / 60000

  const [updated] = await db
    .update(timeEntries)
    .set({ endTime: now, durationMinutes: String(durationMinutes) })
    .where(eq(timeEntries.id, id))
    .returning()

  return updated
}

async function createManual(
  input: { taskId: string; startTime: string; endTime: string; note?: string },
  userId: string,
) {
  await taskService.getTask(input.taskId, userId)

  const start = new Date(input.startTime)
  const end = new Date(input.endTime)

  if (end <= start) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'End time must be after start time' })
  }

  const durationMinutes = (end.getTime() - start.getTime()) / 60000

  const [entry] = await db
    .insert(timeEntries)
    .values({
      taskId: input.taskId,
      userId,
      startTime: start,
      endTime: end,
      durationMinutes: String(durationMinutes),
      note: input.note ?? null,
      isManual: true,
    })
    .returning()

  return entry
}

async function update(
  id: string,
  updates: { startTime?: string; endTime?: string; note?: string },
  userId: string,
) {
  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, id))
    .limit(1)

  if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' })
  if (entry.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your time entry' })

  const updateData: Record<string, unknown> = {}

  if (updates.startTime) updateData.startTime = new Date(updates.startTime)
  if (updates.endTime) updateData.endTime = new Date(updates.endTime)
  if (updates.note !== undefined) updateData.note = updates.note ?? null

  // Recompute duration if times changed
  if (updates.startTime || updates.endTime) {
    const start = updates.startTime ? new Date(updates.startTime) : entry.startTime
    const end = updates.endTime ? new Date(updates.endTime) : entry.endTime
    if (end) {
      const durationMinutes = (end.getTime() - start.getTime()) / 60000
      updateData.durationMinutes = String(durationMinutes)
    }
  }

  const [updated] = await db
    .update(timeEntries)
    .set(updateData)
    .where(eq(timeEntries.id, id))
    .returning()

  return updated
}

async function deleteEntry(id: string, userId: string) {
  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(eq(timeEntries.id, id))
    .limit(1)

  if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Time entry not found' })
  if (entry.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your time entry' })

  await db.delete(timeEntries).where(eq(timeEntries.id, id))
}

export const timeEntryService = { list, getRunning, start, stop, createManual, update, delete: deleteEntry }