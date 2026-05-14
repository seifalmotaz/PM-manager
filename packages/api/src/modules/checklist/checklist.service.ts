import { db } from '../../db/connection'
import { checklistItems } from '../../db/schema'
import { eq, and, asc, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { taskService } from '../task/task.service'

async function list(taskId: string, userId: string) {
  // Verify task access
  await taskService.getTask(taskId, userId)

  return db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))
    .orderBy(asc(checklistItems.sortOrder))
}

async function create(taskId: string, content: string, userId: string) {
  // Verify task access
  await taskService.getTask(taskId, userId)

  // Get the max sortOrder for this task
  const [maxRow] = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${checklistItems.sortOrder}), -1)` })
    .from(checklistItems)
    .where(eq(checklistItems.taskId, taskId))

  const nextOrder = (maxRow?.maxOrder ?? -1) + 1

  const [item] = await db
    .insert(checklistItems)
    .values({ taskId, content, sortOrder: nextOrder })
    .returning()

  return item
}

async function update(id: string, content: string, userId: string) {
  const [item] = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, id))
    .limit(1)

  if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })

  // Verify task access
  await taskService.getTask(item.taskId, userId)

  const [updated] = await db
    .update(checklistItems)
    .set({ content })
    .where(eq(checklistItems.id, id))
    .returning()

  return updated
}

async function toggle(id: string, isCompleted: boolean, userId: string) {
  const [item] = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, id))
    .limit(1)

  if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })

  // Verify task access
  await taskService.getTask(item.taskId, userId)

  const [updated] = await db
    .update(checklistItems)
    .set({ isCompleted })
    .where(eq(checklistItems.id, id))
    .returning()

  return updated
}

async function deleteItem(id: string, userId: string) {
  const [item] = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, id))
    .limit(1)

  if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Checklist item not found' })

  // Verify task access
  await taskService.getTask(item.taskId, userId)

  await db.delete(checklistItems).where(eq(checklistItems.id, id))
}

async function reorder(taskId: string, itemIds: string[], userId: string) {
  // Verify task access
  await taskService.getTask(taskId, userId)

  // Update sortOrder in a transaction
  await db.transaction(async (tx) => {
    for (let i = 0; i < itemIds.length; i++) {
      await tx
        .update(checklistItems)
        .set({ sortOrder: i })
        .where(and(eq(checklistItems.id, itemIds[i]), eq(checklistItems.taskId, taskId)))
    }
  })
}

export const checklistService = { list, create, update, toggle, delete: deleteItem, reorder }