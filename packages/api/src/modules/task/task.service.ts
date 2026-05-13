import { db } from '../../db/connection'
import { tasks, projects } from '../../db/schema'
import { eq, and, lt, ne, asc, inArray, count } from 'drizzle-orm'
import { createAuditLog, auditFieldChange } from '../../shared/audit/audit.service'
import { projectService } from '../project/project.service'
import { workspaceService } from '../workspace/workspace.service'
import { sprintService } from '../sprint/sprint.service'
import { TRPCError } from '@trpc/server'
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

  if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    const projRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(inArray(projects.workspaceId, filters.workspaceIds))
    const projIds = projRows.map(p => p.id)
    if (projIds.length === 0) return []
    conditions.push(inArray(tasks.projectId, projIds))
  }

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

type TaskRow = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: string
  priority: string | null
  storyPoints: string | null
  estimatedHours: string | null
  assigneeId: string | null
  dueDate: Date | null
  deadline: Date | null
  sprintId: string | null
  sprintFlag: string | null
  statusChangedAt: Date
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  project: typeof projects.$inferSelect | null
}

async function getTask(id: string, userId: string): Promise<TaskRow> {
  const rows = await db
    .select({
      task: tasks,
      project: projects,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, id))
    .limit(1)

  if (rows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' })

  const row = rows[0]

  // Verify project access
  await projectService.getProject(row.task.projectId, userId)

  return {
    ...row.task,
    project: row.project,
  }
}

async function createTask(input: CreateTaskInput, userId: string) {
  // Verify project access
  await projectService.getProject(input.projectId, userId)

  // Sprint lock enforcement
  if (input.sprintId) {
    const sprint = await sprintService.getSprint(input.sprintId, userId)
    if (sprintService.isSprintLocked(sprint)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Cannot assign tasks to a completed sprint',
      })
    }
  }

  // If sprintFlag is provided but no sprintId, clear the flag
  if (input.sprintFlag && !input.sprintId) {
    input.sprintFlag = undefined
  }

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
      sprintFlag: (input.sprintId && input.sprintFlag) ? input.sprintFlag : null,
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

    // Sprint lock enforcement when changing sprintId
    if (key === 'sprintId') {
      const newSprintId = value as string | null | undefined

      if (newSprintId) {
        // Verify the sprint exists and is not locked
        const sprint = await sprintService.getSprint(newSprintId, userId)
        if (sprintService.isSprintLocked(sprint)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Cannot assign tasks to a completed sprint',
          })
        }
      }

      // Audit log for sprint reassignment
      auditFieldChange(
        'task', id, userId, 'sprintId',
        task.sprintId || 'none',
        newSprintId || 'none',
      )

      // If sprintId is being set to null (moving to Backlog), also clear sprintFlag
      if (newSprintId === null || newSprintId === undefined) {
        updateData.sprintFlag = null
      }

      // Apply sprintId update directly (skip generic loop fallthrough)
      if (newSprintId !== task.sprintId) {
        updateData.sprintId = newSprintId
      }
      continue
    }

    let currentValue = (task as Record<string, unknown>)[key]

    // Drizzle returns decimal columns as strings — coerce to number for comparison
    if (currentValue !== undefined && currentValue !== null && (key === 'storyPoints' || key === 'estimatedHours')) {
      currentValue = Number(currentValue)
    }

    // Handle date field conversions
    let normalizedValue = value
    if (key === 'dueDate' || key === 'deadline') {
      if (value === null) {
        normalizedValue = null
      } else if (typeof value === 'string') {
        normalizedValue = new Date(value)
      }
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

  // If task is first entering in_progress, audit the startedAt timestamp
  if (newStatus === 'in_progress' && !task.startedAt) {
    await createAuditLog({
      entityType: 'task',
      entityId: id,
      action: 'updated',
      field: 'startedAt',
      oldValue: undefined,
      newValue: now.toISOString(),
      userId,
    })
  }

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
  const userWss = await workspaceService.listUserWorkspaces(userId)
  const wsIds = userWss.map(w => w.id)
  if (wsIds.length === 0) return 0

  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, wsIds))
  const projIds = projRows.map(p => p.id)
  if (projIds.length === 0) return 0

  const [result] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(
      lt(tasks.deadline, new Date()),
      ne(tasks.status, 'done'),
      inArray(tasks.projectId, projIds)
    ))

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

  if (workspaceIds.length === 0) return []

  // Find projects belonging to the given workspaces
  const projRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.workspaceId, workspaceIds))

  const projectIds = projRows.map((p) => p.id)

  if (projectIds.length === 0) return []

  const rows = await db
    .select({
      task: tasks,
      project: projects,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(inArray(tasks.projectId, projectIds))
    .orderBy(asc(tasks.createdAt))

  return rows.map(row => ({
    ...row.task,
    project: row.project,
  }))
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
