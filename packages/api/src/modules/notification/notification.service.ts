import { db } from '../../db/connection'
import { notifications, workspaceMembers, projects, users } from '../../db/schema'
import { eq, and, desc, count } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

// ============ QUERY FUNCTIONS ============

async function list(userId: string, limit: number, offset: number) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset)
}

async function unreadCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ c: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  return result?.c ?? 0
}

async function markRead(id: string, userId: string) {
  const [notif] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .limit(1)

  if (!notif) throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found' })
  if (notif.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your notification' })

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id))
}

async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
}

// ============ TRIGGER FUNCTIONS (fire-and-forget) ============

/**
 * Notify a user when they are assigned to a task.
 */
async function notifyAssigned(taskId: string, taskTitle: string, assigneeId: string) {
  try {
    await db.insert(notifications).values({
      userId: assigneeId,
      type: 'assigned',
      title: `Assigned to "${taskTitle}"`,
      entityType: 'task',
      entityId: taskId,
    })
  } catch (err) {
    console.error('Notification (assigned) failed:', err)
  }
}

/**
 * Notify a user when they are @mentioned in a comment.
 */
async function notifyMentioned(entityType: string, entityId: string, mentionedUserId: string, commenterName: string) {
  try {
    await db.insert(notifications).values({
      userId: mentionedUserId,
      type: 'mentioned',
      title: `${commenterName} mentioned you in a comment`,
      body: entityType,
      entityType: 'comment',
      entityId,
    })
  } catch (err) {
    console.error('Notification (mentioned) failed:', err)
  }
}

/**
 * Notify all workspace members when a sprint starts.
 */
async function notifySprintStart(sprintId: string, sprintName: string, workspaceId: string) {
  try {
    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))

    // Bulk insert for all members
    if (members.length > 0) {
      await db.insert(notifications).values(
        members.map((m) => ({
          userId: m.userId,
          type: 'sprint_started' as const,
          title: `Sprint "${sprintName}" has started`,
          entityType: 'sprint',
          entityId: sprintId,
        })),
      )
    }
  } catch (err) {
    console.error('Notification (sprint_start) failed:', err)
  }
}

/**
 * Notify all workspace members when a sprint ends.
 */
async function notifySprintEnd(sprintId: string, sprintName: string, workspaceId: string) {
  try {
    const members = await db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))

    if (members.length > 0) {
      await db.insert(notifications).values(
        members.map((m) => ({
          userId: m.userId,
          type: 'sprint_ended' as const,
          title: `Sprint "${sprintName}" has ended`,
          entityType: 'sprint',
          entityId: sprintId,
        })),
      )
    }
  } catch (err) {
    console.error('Notification (sprint_end) failed:', err)
  }
}

export const notificationService = {
  list,
  unreadCount,
  markRead,
  markAllRead,
  notifyAssigned,
  notifyMentioned,
  notifySprintStart,
  notifySprintEnd,
}