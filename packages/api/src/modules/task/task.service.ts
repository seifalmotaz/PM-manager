import { db } from '../../db/connection'
import { tasks, projects } from '../../db/schema'
import { eq, and, lt, ne, asc, inArray, count } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { projectService } from '../project/project.service'
import { parseTaskInput } from './nlp-parser'
import type { ParsedTaskInput } from './nlp-parser'

export interface CreateTaskInput {
  projectId: string
  title: string
  priority?: string
  storyPoints?: number
  estimatedHours?: number
  assigneeId?: string
  dueDate?: string
  sprintId?: string
  sprintFlag?: string
  description?: string
}

export interface ListTasksFilters {
  workspaceIds?: string[]
  projectId?: string
  sprintId?: string
  status?: string
  assigneeId?: string
}

async function listTasks(
  filters: ListTasksFilters,
  userId: string,
): Promise<Record<string, unknown>[]> {
  const conditions: any[] = []

  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId))
  }
  if (filters.sprintId) {
    conditions.push(eq(tasks.sprintId, filters.sprintId))
  }
  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status))
  }
  if (filters.assigneeId) {
    conditions.push(eq(tasks.assigneeId, filters.assigneeId))
  }

  return db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.createdAt))
}

async function getTask(id: string, userId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  if (!task) throw new Error('Task not found')

  // Verify project access
  await projectService.getProject(task.projectId, userId)

  return task
}

async function createTask(input: CreateTaskInput, userId: string) {
  // Verify project access
  await projectService.getProject(input.projectId, userId)

  const dueDateValue = input.dueDate ? new Date(input.dueDate) : undefined

  const [task] = await db
    .insert(tasks)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? null,
      storyPoints: input.storyPoints != null ? String(input.storyPoints) : null,
      estimatedHours: input.estimatedHours != null ? String(input.estimatedHours) : null,
      assigneeId: input.assigneeId ?? null,
      dueDate: dueDateValue ?? null,
      sprintId: input.sprintId ?? null,
      sprintFlag: input.sprintFlag ?? null,
      status: 'todo',
      statusChangedAt: new Date(),
    })
    .returning()

  await createAuditLog({
    entityType: 'task',
    entityId: task.id,
    action: 'created',
    userId,
  })

  return task
}

async function updateTask(
  id: string,
  updates: Record<string, unknown>,
  userId: string,
) {
  const task = await getTask(id, userId)
  const updateData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue

    const currentValue = (task as any)[key]

    // Handle date field conversions
    let normalizedValue = value
    if ((key === 'dueDate' || key === 'deadline') && typeof value === 'string') {
      normalizedValue = new Date(value)
    }

    if (normalizedValue !== undefined && currentValue !== normalizedValue) {
      updateData[key] = normalizedValue

      // auditFieldChange is fire-and-forget
      auditFieldChange('task', id, userId, key, currentValue, normalizedValue)
    }
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date()

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning()

    return updated
  }

  return task
}

async function changeStatus(id: string, newStatus: string, userId: string) {
  const task = await getTask(id, userId)
  const now = new Date()

  const oldStatus = task.status

  const statusData: Record<string, unknown> = {
    status: newStatus,
    statusChangedAt: now,
  }

  // Timestamp management
  if (newStatus === 'in_progress' && !task.startedAt) {
    statusData.startedAt = now
  }
  if (newStatus === 'done') {
    statusData.completedAt = now
  }
  if (oldStatus === 'done' && newStatus !== 'done') {
    statusData.completedAt = null
  }

  const [updated] = await db
    .update(tasks)
    .set({ ...statusData, updatedAt: now })
    .where(eq(tasks.id, id))
    .returning()

  // Create status_changed audit entry
  await createAuditLog({
    entityType: 'task',
    entityId: id,
    action: 'status_changed',
    field: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    userId,
  })

  // If reopening from done, create additional audit entry for completedAt clearing
  if (oldStatus === 'done' && newStatus !== 'done') {
    await createAuditLog({
      entityType: 'task',
      entityId: id,
      action: 'updated',
      field: 'completedAt',
      oldValue: task.completedAt?.toISOString() ?? undefined,
      newValue: undefined,
      userId,
    })
  }

  return updated
}

async function getOverdueCount(userId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(lt(tasks.deadline, new Date()), ne(tasks.status, 'done')))

  return result?.value ?? 0
}

async function deleteTask(id: string, userId: string) {
  await getTask(id, userId)

  // Audit before deletion
  await createAuditLog({
    entityType: 'task',
    entityId: id,
    action: 'deleted',
    userId,
  })

  await db.delete(tasks).where(eq(tasks.id, id))
}

async function listHome(workspaceIds: string[], userId: string) {
  // Note: userId is available for future use (e.g., filtering by assigned tasks)
  void userId

  if (workspaceIds.length === 0) {
    return db.select().from(tasks).orderBy(asc(tasks.createdAt))
  }

  // Find projects belonging to the given workspaces
  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, workspaceIds))

  const projectIds = projRows.map((p) => p.id)

  if (projectIds.length === 0) return []

  return db
    .select()
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .orderBy(asc(tasks.createdAt))
}

export const taskService = {
  parseTaskInput,
  listTasks,
  getTask,
  createTask,
  updateTask,
  changeStatus,
  deleteTask,
  getOverdueCount,
  listHome,
}
